const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config();

// ─── Storage Roots ───────────────────────────────────────────
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");
const GALLERY_DIR = path.join(UPLOADS_ROOT, "galleries");
const SITE_DIR = path.join(UPLOADS_ROOT, "site");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(GALLERY_DIR);
ensureDir(SITE_DIR);

// ─── Limits ──────────────────────────────────────────────────
const MAX_FILE_MB = parseInt(process.env.MAX_IMAGE_MB || 15, 10);
const MAX_IMAGES_PER_GALLERY = 100;

// ─── File Filter (images only) ───────────────────────────────
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WebP, GIF and AVIF are allowed.`));
  }
};

// ─── Disk Storage ────────────────────────────────────────────
const storageFor = (dir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 10) || ".jpg";
      const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
      cb(null, name);
    },
  });

// ─── Uploaders ───────────────────────────────────────────────
// Up to 100 images per gallery
const uploadGalleryImages = multer({
  storage: storageFor(GALLERY_DIR),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_MB * 1024 * 1024,
    files: MAX_IMAGES_PER_GALLERY,
  },
});

// Single image for CMS content (hero/about/testimonials avatars etc.)
const uploadSiteImage = multer({
  storage: storageFor(SITE_DIR),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_MB * 1024 * 1024,
    files: 1,
  },
});

// ─── Multer Error Wrapper ────────────────────────────────────
const handleUploadErrors = (fn) => (req, res, next) => {
  fn(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Each image must be under ${MAX_FILE_MB}MB`
          : err.code === "LIMIT_FILE_COUNT"
          ? `You can upload up to ${MAX_IMAGES_PER_GALLERY} images at once`
          : err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Unexpected upload field. Use the 'images' field for gallery files."
          : err.message;
      return res.status(400).json({ success: false, message });
    }
    return res.status(400).json({ success: false, message: err.message || "Upload failed" });
  });
};

module.exports = {
  UPLOADS_ROOT,
  GALLERY_DIR,
  SITE_DIR,
  MAX_FILE_MB,
  MAX_IMAGES_PER_GALLERY,
  uploadGalleryImages,
  uploadSiteImage,
  handleUploadErrors,
};
