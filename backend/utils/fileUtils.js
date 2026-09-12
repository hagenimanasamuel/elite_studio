const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─── Safe File Deletion ──────────────────────────────────────
const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`⚠️  Failed to delete file ${filePath}:`, err.message);
  }
};

// ─── Delete Uploaded Gallery Files ───────────────────────────
const deleteGalleryFiles = (galleryDir, filenames) => {
  (filenames || []).forEach((name) => safeUnlink(path.join(galleryDir, path.basename(name))));
};

// ─── Generate Short Share Token ──────────────────────────────
const generateShareToken = () => {
  return crypto.randomBytes(9).toString("base64url"); // ~12 chars, URL-safe
};

// ─── Format Bytes ────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

module.exports = { safeUnlink, deleteGalleryFiles, generateShareToken, formatBytes };
