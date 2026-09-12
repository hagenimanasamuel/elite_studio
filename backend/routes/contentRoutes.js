const express = require("express");
const router = express.Router();
const contentController = require("../controllers/contentController");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");
const { uploadSiteImage, handleUploadErrors } = require("../middleware/upload");

// ─── Public: read site content (landing page) ────────────────
router.get("/", contentController.getContent);
router.get("/:section", contentController.getSection);

// ─── Admin: edit site content ────────────────────────────────
router.put(
  "/upload-image",
  authenticateToken,
  isAdmin,
  handleUploadErrors(uploadSiteImage.single("image")),
  contentController.uploadImage
);
router.put("/:section", authenticateToken, isAdmin, contentController.updateSection);
router.delete("/:section", authenticateToken, isAdmin, contentController.resetSection);

module.exports = router;
