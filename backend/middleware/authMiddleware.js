const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Authenticate Token ──────────────────────────────────────
exports.authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const finalToken = token || headerToken;

  if (!finalToken) {
    return res.status(401).json({ 
      success: false,
      message: "Access token required",
      code: "NO_TOKEN"
    });
  }

  jwt.verify(finalToken, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ 
          success: false,
          message: "Token expired", 
          code: "TOKEN_EXPIRED" 
        });
      }
      return res.status(403).json({ 
        success: false,
        message: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }
    req.user = user;
    next();
  });
};

// ─── Optional Auth ──────────────────────────────────────────
exports.optionalAuth = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// ─── Admin Check ──────────────────────────────────────────────
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  // Allow super_admin and admin roles
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Admin access required",
  });
};

// ─── Super Admin Check ────────────────────────────────────────
exports.isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: "Super Admin access required",
    });
  }
  next();
};

// ─── Staff Check ──────────────────────────────────────────────
exports.isStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  // Allow staff, admin, and super_admin
  if (req.user.role === 'staff' || req.user.role === 'admin' || req.user.role === 'super_admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Staff access required",
  });
};