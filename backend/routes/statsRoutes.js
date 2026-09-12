const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");

// ─── Admin Dashboard Stats ───────────────────────────────────
router.get("/", authenticateToken, isAdmin, statsController.getStats);

module.exports = router;
