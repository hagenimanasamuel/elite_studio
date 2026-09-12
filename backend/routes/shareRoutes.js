const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const shareController = require("../controllers/shareController");

// ─── Brute-force protection on unlock (password guessing) ────
const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    code: "TOO_MANY_ATTEMPTS",
    message: "Too many attempts. Please try again in a few minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public Share Routes ─────────────────────────────────────
router.get("/:token", shareController.getInfo);
router.post("/:token/unlock", unlockLimiter, shareController.unlock);
router.get("/:token/images/:imageId/download", shareController.downloadImage);
router.get("/:token/download-all", shareController.downloadAll);

module.exports = router;
