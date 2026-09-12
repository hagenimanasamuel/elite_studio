const { promisePool, executeQuery } = require("../config/dbConfig");
const { deleteAssetsQuietly } = require("./storageService");

// ─── Compute Live Status of a Gallery ────────────────────────
// status column only stores active/deleted; everything else is derived
const computeStatus = (gallery) => {
  if (!gallery || gallery.status === "deleted") return "deleted";
  if (gallery.expires_at && new Date(gallery.expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  if (
    gallery.max_views !== null &&
    gallery.max_views !== undefined &&
    Number(gallery.view_count || 0) >= Number(gallery.max_views)
  ) {
    return "view_limit_reached";
  }
  return "active";
};

// ─── Public-safe JSON shape ──────────────────────────────────
const publicMeta = (gallery) => ({
  title: gallery.title,
  description: gallery.description,
  coverUrl: gallery.cover_image_url,
  imageCount: Number(gallery.image_count ?? gallery.imageCount ?? 0),
  requiresPassword: !!gallery.has_password,
  allowDownload: !!gallery.allow_download,
  expiresAt: gallery.expires_at,
  remainingViews:
    gallery.max_views === null || gallery.max_views === undefined
      ? null
      : Math.max(0, Number(gallery.max_views) - Number(gallery.view_count || 0)),
});

// ─── Permanently Destroy a Gallery ───────────────────────────
// Removes DB rows (images + logs cascade), then wipes the files from
// the active storage driver (Cloudinary or local disk).
const destroyGallery = async (galleryId) => {
  try {
    await executeQuery("UPDATE galleries SET status = 'deleted' WHERE id = ?", [galleryId]);

    const [images] = await promisePool.query(
      "SELECT public_id, url FROM gallery_images WHERE gallery_id = ?",
      [galleryId]
    );

    await promisePool.query("DELETE FROM galleries WHERE id = ? AND status = 'deleted'", [galleryId]);

    deleteAssetsQuietly(images.map((img) => ({ publicId: img.public_id, url: img.url })));

    console.log(`🗑️  Gallery #${galleryId} permanently destroyed (${images.length} files removed from storage)`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to destroy gallery #${galleryId}:`, err.message);
    return false;
  }
};

module.exports = { computeStatus, publicMeta, destroyGallery };
