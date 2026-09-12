const express = require("express");
const router = express.Router();
const galleryController = require("../controllers/galleryController");
const { authenticateToken, isStaff } = require("../middleware/authMiddleware");
const { uploadGalleryImages, handleUploadErrors } = require("../middleware/upload");

// All gallery management routes require an authenticated staff/admin account
router.use(authenticateToken, isStaff);

// ─── Gallery CRUD ────────────────────────────────────────────
router.get("/", galleryController.getAllGalleries);
router.post(
  "/",
  handleUploadErrors(uploadGalleryImages.array("images", 100)),
  galleryController.createGallery
);
router.get("/:id", galleryController.getGalleryById);
router.put("/:id", galleryController.updateGallery);
router.delete("/:id", galleryController.deleteGallery);

// ─── Images inside a gallery ─────────────────────────────────
router.post(
  "/:id/images",
  handleUploadErrors(uploadGalleryImages.array("images", 100)),
  galleryController.addImages
);
router.put("/:id/images/:imageId", galleryController.updateImage);
router.delete("/:id/images/:imageId", galleryController.deleteImage);

// ─── Share link utilities ────────────────────────────────────
router.post("/:id/regenerate-token", galleryController.regenerateToken);

module.exports = router;
