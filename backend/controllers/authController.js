const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { promisePool } = require("../config/dbConfig");
const { sendResetCode } = require("../utils/mailer");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY = "30d";

// ─── Generate Tokens ──────────────────────────────────────────
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

// ─── Set Auth Cookies ──────────────────────────────────────────
// Cookie flags are derived from the real client protocol, NOT from
// NODE_ENV. Marking cookies `secure` while serving plain HTTP makes
// browsers drop them, which breaks every authenticated request.
const useSecureCookies = () => {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  const client = process.env.CLIENT_URL || "";
  const isLocal =
    client.includes("localhost") ||
    client.includes("127.0.0.1");
  return client.startsWith("https") && !isLocal;
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  const secure = useSecureCookies();

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

// ─── Clear Auth Cookies ────────────────────────────────────────
const clearAuthCookies = (res) => {
  const secure = useSecureCookies();
  const opts = {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
  };
  res.clearCookie("accessToken", opts);
  res.clearCookie("refreshToken", opts);
};

// ════════════════════════════════════════════════════════════════
// 1. REGISTER
// ════════════════════════════════════════════════════════════════
exports.register = async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: "Full name, email and password are required" 
    });
  }

  try {
    // SECURITY: public registration always creates plain staff accounts.
    // The client-supplied role is ignored; admins promote users via
    // the Users management page instead.
    let role = "staff";

    const [existingUsers] = await promisePool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: "Email already exists" 
      });
    }

    // Bootstrap convenience: the very first account ever created may be
    // an admin so a fresh install is usable without seeding.
    if (process.env.ALLOW_BOOTSTRAP_ADMIN !== "false") {
      const [anyUser] = await promisePool.query("SELECT COUNT(*) AS count FROM users");
      if (Number(anyUser[0].count) === 0 && process.env.ADMIN_EMAIL !== email) {
        role = "admin";
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const [result] = await promisePool.query(
      "INSERT INTO users (uuid, full_name, email, password, role, is_active, created_at) VALUES (UUID(), ?, ?, ?, ?, 1, NOW())",
      [full_name, email, hashedPassword, role]
    );

    const [newUser] = await promisePool.query(
      "SELECT id, uuid, full_name, email, role, is_active, profile_image_url, phone_number, address FROM users WHERE id = ?",
      [result.insertId]
    );

    const user = newUser[0];
    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      user: {
        id: user.id,
        uuid: user.uuid,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.is_active === 1 ? "active" : "pending",
        profile_image_url: user.profile_image_url || null,
        phone_number: user.phone_number || null,
        address: user.address || null,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Registration failed", 
      error: error.message 
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 2. LOGIN
// ════════════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: "Email and password are required" 
    });
  }

  try {
    const [results] = await promisePool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    
    if (results.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    const user = results[0];

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: "Account is deactivated or not approved yet." 
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    await promisePool.query(
      "UPDATE users SET last_login = NOW() WHERE id = ?",
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    delete user.password;
    delete user.reset_token;
    delete user.reset_token_expires;

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        uuid: user.uuid,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.is_active === 1 ? "active" : "pending",
        profile_image_url: user.profile_image_url || null,
        phone_number: user.phone_number || null,
        address: user.address || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error. Please try again later." 
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 3. REFRESH TOKEN
// ════════════════════════════════════════════════════════════════
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: "No refresh token provided",
        code: "NO_REFRESH_TOKEN"
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    const [users] = await promisePool.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    const user = users[0];

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      clearAuthCookies(res);
      return res.status(401).json({ 
        success: false,
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN"
      });
    }
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 4. LOGOUT
// ════════════════════════════════════════════════════════════════
exports.logout = async (req, res) => {
  try {
    clearAuthCookies(res);
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    clearAuthCookies(res);
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 5. GET PROFILE
// ════════════════════════════════════════════════════════════════
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [results] = await promisePool.query(
      `SELECT 
        id, uuid, full_name, email, role, status, is_active,
        profile_image_url, phone_number, address,
        created_at, last_login
      FROM users 
      WHERE id = ?`,
      [userId]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    res.status(200).json({
      success: true,
      user: results[0]
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to get profile" 
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 6. UPDATE PROFILE
// ════════════════════════════════════════════════════════════════
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone_number, address } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    
    if (full_name) {
      updateFields.push("full_name = ?");
      updateValues.push(full_name);
    }
    if (phone_number !== undefined) {
      updateFields.push("phone_number = ?");
      updateValues.push(phone_number);
    }
    if (address !== undefined) {
      updateFields.push("address = ?");
      updateValues.push(address);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No fields to update" 
      });
    }
    
    updateValues.push(userId);
    await promisePool.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );
    
    const [updatedUser] = await promisePool.query(
      "SELECT id, uuid, full_name, email, role, phone_number, address, profile_image_url FROM users WHERE id = ?",
      [userId]
    );
    
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser[0]
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update profile" 
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 7. CHANGE PASSWORD
// ════════════════════════════════════════════════════════════════
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false,
        message: "Current password and new password are required" 
      });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "New password must be at least 6 characters" 
      });
    }
    
    const [users] = await promisePool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    const isMatch = bcrypt.compareSync(current_password, users[0].password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Current password is incorrect" 
      });
    }
    
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    
    await promisePool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );
    
    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to change password" 
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 8. FORGOT PASSWORD
// ════════════════════════════════════════════════════════════════
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false,
      message: "Email is required." 
    });
  }

  try {
    const [results] = await promisePool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No user found with that email." 
      });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await promisePool.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [resetToken, expires, results[0].id]
    );

    // Deliver the code by email when SMTP is configured; otherwise expose it
    // so local development keeps working without a mail server.
    const mailResult = await sendResetCode(email, resetToken, results[0].full_name);

    res.status(200).json({ 
      success: true,
      message: mailResult.sent
        ? "Reset code sent to your email."
        : "SMTP is not configured — use the dev code below.",
      ...(mailResult.sent ? {} : { resetToken }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ 
      success: false,
      message: "Database error.", 
      error: error.message 
    });
  }
};

// ════════════════════════════════════════════════════════════════
// 9. RESET PASSWORD
// ════════════════════════════════════════════════════════════════
exports.resetPassword = async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ 
      success: false,
      message: "Token and new password are required." 
    });
  }

  try {
    const [results] = await promisePool.query(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    );
    
    if (results.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired token." 
      });
    }

    const user = results[0];
    const hashedPassword = bcrypt.hashSync(new_password, 10);

    await promisePool.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    res.status(200).json({ 
      success: true,
      message: "Password has been reset successfully." 
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to reset password.", 
      error: error.message 
    });
  }
};