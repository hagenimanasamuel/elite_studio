const bcrypt = require("bcryptjs");
const { promisePool } = require("../config/dbConfig");
const { generateUUID } = require("../config/dbConfig");

// ─── Get All Users (Admin & Super Admin only) ────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT id, uuid, full_name, email, role, status, is_active, 
             phone_number, profile_image_url, last_login, created_at
      FROM users 
      WHERE 1=1
    `;
    const params = [];

    // SUPER ADMIN FIX: Don't show super_admin users to regular admins
    if (req.user.role !== 'super_admin') {
      sql += " AND role != 'super_admin'";
    }

    // Filter by role
    if (role) {
      sql += " AND role = ?";
      params.push(role);
    }

    // Filter by status
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    // Search by name or email
    if (search) {
      sql += " AND (full_name LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Count total
    const countSql = sql.replace(
      "SELECT id, uuid, full_name, email, role, status, is_active, phone_number, profile_image_url, last_login, created_at FROM users",
      "SELECT COUNT(*) as total FROM users"
    );
    const [countResult] = await promisePool.query(countSql, params);
    const total = countResult.total;

    // Order and paginate
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await promisePool.query(sql, params);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// ─── Get Single User ───────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await promisePool.query(
      `SELECT id, uuid, full_name, email, role, status, is_active, 
              phone_number, profile_image_url, address, last_login, created_at
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // SUPER ADMIN FIX: Regular admins can't see super_admin users
    if (req.user.role !== 'super_admin' && users[0].role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.status(200).json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

// ─── Create User (Admin only) ──────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const { full_name, email, password, role = "staff", phone_number, address } = req.body;

    // Validation
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required",
      });
    }

    // Check if user exists
    const [existing] = await promisePool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // SUPER ADMIN FIX: Only super_admin can create super_admin
    if (role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can create Super Admin users",
      });
    }

    // SUPER ADMIN FIX: Admin can only create staff
    if (req.user.role === 'admin' && role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: "Admin can only create staff users",
      });
    }

    const uuid = generateUUID();
    const hashedPassword = bcrypt.hashSync(password, 10);

    const [result] = await promisePool.query(
      `INSERT INTO users (uuid, full_name, email, password, role, phone_number, address, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [uuid, full_name, email, hashedPassword, role, phone_number || null, address || null]
    );

    const [newUser] = await promisePool.query(
      `SELECT id, uuid, full_name, email, role, status, is_active, phone_number, address, created_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser[0],
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

// ─── Update User (Admin only) ──────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, status, phone_number, address, is_active } = req.body;

    // Check if user exists
    const [existing] = await promisePool.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = existing[0];

    // SUPER ADMIN FIX: Prevent updating super_admin
    if (user.role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot update Super Admin user",
      });
    }

    // SUPER ADMIN FIX: Prevent changing super_admin role
    if (user.role === "super_admin" && role && role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot change Super Admin role",
      });
    }

    // SUPER ADMIN FIX: Only super_admin can assign super_admin
    if (role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can assign Super Admin role",
      });
    }

    // SUPER ADMIN FIX: Admin can only update staff
    if (req.user.role === 'admin' && user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: "Admin can only update staff users",
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (full_name) {
      updates.push("full_name = ?");
      values.push(full_name);
    }
    if (email) {
      const [emailCheck] = await promisePool.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, id]
      );
      if (emailCheck.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
      updates.push("email = ?");
      values.push(email);
    }
    if (role) {
      updates.push("role = ?");
      values.push(role);
    }
    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    if (phone_number !== undefined) {
      updates.push("phone_number = ?");
      values.push(phone_number);
    }
    if (address !== undefined) {
      updates.push("address = ?");
      values.push(address);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    values.push(id);
    await promisePool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const [updatedUser] = await promisePool.query(
      `SELECT id, uuid, full_name, email, role, status, is_active, phone_number, address, created_at
       FROM users WHERE id = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser[0],
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

// ─── Delete User (Hard Delete - FIXED) ────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Cannot delete self
    if (parseInt(id) === currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Check if user exists
    const [existing] = await promisePool.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = existing[0];

    // SUPER ADMIN FIX: Prevent deleting super_admin
    if (user.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete Super Admin user",
      });
    }

    // SUPER ADMIN FIX: Admin can only delete staff
    if (req.user.role === 'admin' && user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: "Admin can only delete staff users",
      });
    }

    // HARD DELETE - Actually remove from database
    await promisePool.query(
      "DELETE FROM users WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

// ─── Get Current User Profile ──────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await promisePool.query(
      `SELECT id, uuid, full_name, email, role, status, is_active, 
              phone_number, profile_image_url, address, last_login, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
};

// ─── Update Current User Profile ──────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone_number, address } = req.body;

    const updates = [];
    const values = [];

    if (full_name) {
      updates.push("full_name = ?");
      values.push(full_name);
    }
    if (phone_number !== undefined) {
      updates.push("phone_number = ?");
      values.push(phone_number);
    }
    if (address !== undefined) {
      updates.push("address = ?");
      values.push(address);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    values.push(userId);
    await promisePool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const [updatedUser] = await promisePool.query(
      `SELECT id, uuid, full_name, email, role, status, is_active, phone_number, address, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// ─── Change Password ────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const [users] = await promisePool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = bcrypt.compareSync(current_password, users[0].password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);
    await promisePool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};