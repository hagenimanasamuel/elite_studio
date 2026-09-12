const path = require("path");
const bcrypt = require("bcryptjs");
const { promisePool } = require("../config/dbConfig");
const { MAX_IMAGES_PER_GALLERY } = require("../middleware/upload");
const { generateShareToken, safeUnlink } = require("../utils/fileUtils");
const { putFile, deleteAssetsQuietly } = require("../utils/storageService");
const { computeStatus, destroyGallery } = require("../utils/galleryUtils");

// ─── Helpers ─────────────────────────────────────────────────
const parseBool = (v) =>
  v === true || v === "true" || v === "1" || v === 1;

const parseExpiry = (v) => {
  if (!v || v === "never" || v === "null" || v === "undefined") return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  // Date-only strings (YYYY-MM-DD) expire at the end of that day
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) d.setHours(23, 59, 59, 0);
  return d;
};

const parseIntOrNull = (v) => {
  if (v === undefined || v === null || v === "" || v === "null") return null;
  const n = parseInt(v, 10);
  return isNaN(n) || n <= 0 ? null : n;
};

const galleryWithStatus = (row) => ({
  ...row,
  live_status: computeStatus(row),
});

// ─── Create Gallery (with up to 100 images) ──────────────────
exports.createGallery = async (req, res) => {
  try {
    const {
      title,
      description,
      password,
      allowDownload,
      expiresAt,
      maxViews,
      deleteAfterView,
      deleteAfterDownload,
    } = req.body;

    if (!title || !title.trim()) {
      req.files?.forEach((f) => safeUnlink(f.path));
      return res.status(400).json({ success: false, message: "Gallery title is required" });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image is required" });
    }
    if (files.length > MAX_IMAGES_PER_GALLERY) {
      files.forEach((f) => safeUnlink(f.path));
      return res.status(400).json({
        success: false,
        message: `You can upload a maximum of ${MAX_IMAGES_PER_GALLERY} images`,
      });
    }

    const deleteAfterViewFlag = parseBool(deleteAfterView);
    // A view-destructive link cannot reliably serve downloads afterwards
    const allowDownloadFlag = deleteAfterViewFlag ? false : parseBool(allowDownload);

    let passwordHash = null;
    if (!deleteAfterViewFlag && password && String(password).trim()) {
      passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    const shareToken = generateShareToken();

    const [result] = await promisePool.query(
      `INSERT INTO galleries
        (uuid, share_token, title, description, created_by, has_password, password_hash,
         allow_download, expires_at, max_views, delete_after_view, delete_after_download, status)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        shareToken,
        title.trim(),
        description?.trim() || null,
        req.user?.id || null,
        !!passwordHash,
        passwordHash,
        allowDownloadFlag,
        parseExpiry(expiresAt),
        parseIntOrNull(maxViews),
        deleteAfterViewFlag,
        parseBool(deleteAfterDownload),
      ]
    );

    const galleryId = result.insertId;

    // Move uploads into the active store (Cloudinary or local)
    const stored = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const uploaded = await putFile(f.path, { folder: "galleries" });
        stored.push({
          originalName: Buffer.from(f.originalname, "latin1").toString("utf8"),
          url: uploaded.url,
          publicId: uploaded.publicId,
          mime: f.mimetype,
          size: uploaded.size,
          filename: path.basename(uploaded.url),
        });
      }
    } catch (uploadErr) {
      console.error("Upload to storage failed:", uploadErr);
      // Clean up anything that already made it to the store
      deleteAssetsQuietly(stored.map((s) => ({ publicId: s.publicId, url: s.url })));
      files.forEach((f) => safeUnlink(f.path));
      await promisePool.query("DELETE FROM galleries WHERE id = ?", [galleryId]);
      return res.status(500).json({ success: false, message: "Failed to store images. Please try again." });
    }

    // Insert image rows
    const values = stored.map((s, i) => [
      galleryId,
      s.filename,
      s.originalName,
      s.url,
      s.publicId,
      s.mime,
      s.size,
      i,
    ]);

    await promisePool.query(
      `INSERT INTO gallery_images
        (gallery_id, filename, original_name, url, public_id, mime_type, size_bytes, sort_order)
       VALUES ?`,
      [values]
    );

    // First image becomes the cover
    await promisePool.query(
      "UPDATE galleries SET cover_image_url = ? WHERE id = ?",
      [stored[0].url, galleryId]
    );

    const [gallery] = await promisePool.query("SELECT * FROM galleries WHERE id = ?", [galleryId]);
    const [images] = await promisePool.query(
      "SELECT * FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC",
      [galleryId]
    );

    res.status(201).json({
      success: true,
      message: "Gallery created successfully",
      data: { ...galleryWithStatus(gallery[0]), images },
    });
  } catch (error) {
    req.files?.forEach((f) => safeUnlink(f.path));
    console.error("Create gallery error:", error);
    res.status(500).json({ success: false, message: "Failed to create gallery" });
  }
};

// ─── Get All Galleries (with stats + search + pagination) ────
exports.getAllGalleries = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const offset = (page - 1) * limit;
    const { search, status } = req.query;

    let where = "WHERE g.status = 'active'";
    const params = [];

    if (search) {
      where += " AND (g.title LIKE ? OR g.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await promisePool.query(
      `SELECT g.*,
              COUNT(gi.id) AS images_count,
              COALESCE(SUM(gi.size_bytes), 0) AS total_size
         FROM galleries g
         LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
         ${where}
         GROUP BY g.id
         ORDER BY g.created_at DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await promisePool.query(
      `SELECT COUNT(*) AS total FROM galleries g ${where}`,
      params
    );

    const [agg] = await promisePool.query(
      `SELECT COUNT(*) AS total_images,
              COALESCE(SUM(size_bytes), 0) AS total_storage
         FROM gallery_images gi
         INNER JOIN galleries g ON g.id = gi.gallery_id
         WHERE g.status = 'active'`
    );

    const galleries = rows.map((r) => ({
      ...galleryWithStatus(r),
      total_size_formatted: formatBytes(Number(r.total_size)),
    }));

    res.status(200).json({
      success: true,
      data: galleries,
      meta: {
        total_images: Number(agg[0].total_images),
        total_storage: Number(agg[0].total_storage),
        total_storage_formatted: formatBytes(Number(agg[0].total_storage)),
      },
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get galleries error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch galleries" });
  }
};

// ─── Get Single Gallery ──────────────────────────────────────
exports.getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [galleries] = await promisePool.query(
      "SELECT * FROM galleries WHERE uuid = ? OR id = ?",
      [id, isNaN(Number(id)) ? -1 : Number(id)]
    );

    if (galleries.length === 0) {
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }

    const [images] = await promisePool.query(
      "SELECT * FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC",
      [galleries[0].id]
    );

    const [logs] = await promisePool.query(
      `SELECT action, ip_address, created_at FROM gallery_access_logs
       WHERE gallery_id = ? ORDER BY created_at DESC LIMIT 20`,
      [galleries[0].id]
    );

    res.status(200).json({
      success: true,
      data: { ...galleryWithStatus(galleries[0]), images, recent_activity: logs },
    });
  } catch (error) {
    console.error("Get gallery error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch gallery" });
  }
};

// ─── Update Gallery Settings/Metadata ────────────────────────
exports.updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      password,
      allowDownload,
      expiresAt,
      maxViews,
      deleteAfterView,
      deleteAfterDownload,
      coverImageId,
    } = req.body;

    const [galleries] = await promisePool.query(
      "SELECT * FROM galleries WHERE uuid = ? OR id = ?",
      [id, isNaN(Number(id)) ? -1 : Number(id)]
    );

    if (galleries.length === 0) {
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }

    const gallery = galleries[0];
    const updates = {};
    const params = [];

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ success: false, message: "Title cannot be empty" });
      }
      updates.title = "title = ?";
      params.push(String(title).trim());
    }

    if (description !== undefined) {
      updates.description = "description = ?";
      params.push(description ? String(description).trim() : null);
    }

    // Password: empty string removes protection, value sets it, undefined keeps it
    if (password !== undefined) {
      const pwd = String(password).trim();
      if (pwd === "") {
        updates.password = "has_password = 0, password_hash = NULL";
      } else {
        const hash = await bcrypt.hash(pwd, 10);
        updates.password = "has_password = 1, password_hash = ?";
        params.push(hash);
      }
    }

    if (deleteAfterView !== undefined) {
      const flag = parseBool(deleteAfterView);
      updates.deleteAfterView = "delete_after_view = ?";
      params.push(flag);
      if (flag) {
        // View-destructive links cannot offer downloads
        updates.forceNoDownload = "allow_download = 0";
      }
    } else if (allowDownload !== undefined && !parseBool(req.body.deleteAfterView)) {
      updates.allowDownload = "allow_download = ?";
      params.push(parseBool(allowDownload));
    }

    if (deleteAfterDownload !== undefined) {
      updates.deleteAfterDownload = "delete_after_download = ?";
      params.push(parseBool(deleteAfterDownload));
    }

    if (expiresAt !== undefined) {
      updates.expiresAt = "expires_at = ?";
      params.push(parseExpiry(expiresAt));
    }

    if (maxViews !== undefined) {
      updates.maxViews = "max_views = ?";
      params.push(parseIntOrNull(maxViews));
    }

    if (coverImageId !== undefined) {
      const [img] = await promisePool.query(
        "SELECT url FROM gallery_images WHERE id = ? AND gallery_id = ?",
        [coverImageId, gallery.id]
      );
      if (img.length > 0) {
        updates.cover = "cover_image_url = ?";
        params.push(img[0].url);
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update" });
    }

    params.push(gallery.id);
    await promisePool.query(
      `UPDATE galleries SET ${Object.values(updates).join(", ")} WHERE id = ?`,
      params
    );

    const [updated] = await promisePool.query("SELECT * FROM galleries WHERE id = ?", [gallery.id]);

    res.status(200).json({
      success: true,
      message: "Gallery updated successfully",
      data: galleryWithStatus(updated[0]),
    });
  } catch (error) {
    console.error("Update gallery error:", error);
    res.status(500).json({ success: false, message: "Failed to update gallery" });
  }
};

// ─── Add More Images to Existing Gallery ─────────────────────
exports.addImages = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];

    const [galleries] = await promisePool.query(
      "SELECT * FROM galleries WHERE uuid = ? OR id = ?",
      [id, isNaN(Number(id)) ? -1 : Number(id)]
    );

    if (galleries.length === 0) {
      files.forEach((f) => safeUnlink(f.path));
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const galleryId = galleries[0].id;

    const [countRows] = await promisePool.query(
      "SELECT COUNT(*) AS count FROM gallery_images WHERE gallery_id = ?",
      [galleryId]
    );
    const existingCount = Number(countRows[0].count);

    if (existingCount + files.length > MAX_IMAGES_PER_GALLERY) {
      files.forEach((f) => safeUnlink(f.path));
      return res.status(400).json({
        success: false,
        message: `Limit reached: a gallery can hold at most ${MAX_IMAGES_PER_GALLERY} images (${existingCount} already uploaded)`,
      });
    }

    const [maxRow] = await promisePool.query(
      "SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM gallery_images WHERE gallery_id = ?",
      [galleryId]
    );
    const startSort = Number(maxRow[0].max_sort) + 1;

    // Move uploads into the active store (Cloudinary or local)
    const stored = [];
    try {
      for (const f of files) {
        const uploaded = await putFile(f.path, { folder: "galleries" });
        stored.push({
          originalName: Buffer.from(f.originalname, "latin1").toString("utf8"),
          url: uploaded.url,
          publicId: uploaded.publicId,
          mime: f.mimetype,
          size: uploaded.size,
          filename: path.basename(uploaded.url),
        });
      }
    } catch (uploadErr) {
      console.error("Upload to storage failed:", uploadErr);
      deleteAssetsQuietly(stored.map((s) => ({ publicId: s.publicId, url: s.url })));
      files.forEach((f) => safeUnlink(f.path));
      return res.status(500).json({ success: false, message: "Failed to store images. Please try again." });
    }

    const values = stored.map((s, i) => [
      galleryId,
      s.filename,
      s.originalName,
      s.url,
      s.publicId,
      s.mime,
      s.size,
      startSort + i,
    ]);

    await promisePool.query(
      `INSERT INTO gallery_images
        (gallery_id, filename, original_name, url, public_id, mime_type, size_bytes, sort_order)
       VALUES ?`,
      [values]
    );

    // Set cover if gallery has none yet
    if (!galleries[0].cover_image_url) {
      await promisePool.query(
        "UPDATE galleries SET cover_image_url = ? WHERE id = ?",
        [stored[0].url, galleryId]
      );
    }

    const [images] = await promisePool.query(
      "SELECT * FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC",
      [galleryId]
    );

    res.status(201).json({
      success: true,
      message: `${files.length} image(s) added`,
      data: images,
    });
  } catch (error) {
    req.files?.forEach((f) => safeUnlink(f.path));
    console.error("Add images error:", error);
    res.status(500).json({ success: false, message: "Failed to add images" });
  }
};

// ─── Update Image (caption / ordering) ───────────────────────
exports.updateImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const { caption, sortOrder } = req.body;

    const [galleries] = await promisePool.query(
      "SELECT id FROM galleries WHERE uuid = ? OR id = ?",
      [id, isNaN(Number(id)) ? -1 : Number(id)]
    );
    if (galleries.length === 0) {
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }

    const [images] = await promisePool.query(
      "SELECT * FROM gallery_images WHERE id = ? AND gallery_id = ?",
      [imageId, galleries[0].id]
    );
    if (images.length === 0) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    const updates = [];
    const params = [];
    if (caption !== undefined) {
      updates.push("caption = ?");
      params.push(caption ? String(caption).slice(0, 255) : null);
    }
    if (sortOrder !== undefined && !isNaN(parseInt(sortOrder, 10))) {
      updates.push("sort_order = ?");
      params.push(parseInt(sortOrder, 10));
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update" });
    }

    params.push(images[0].id);
    await promisePool.query(`UPDATE gallery_images SET ${updates.join(", ")} WHERE id = ?`, params);

    const [updated] = await promisePool.query("SELECT * FROM gallery_images WHERE id = ?", [
      images[0].id,
    ]);

    res.status(200).json({ success: true, message: "Image updated", data: updated[0] });
  } catch (error) {
    console.error("Update image error:", error);
    res.status(500).json({ success: false, message: "Failed to update image" });
  }
};

// ─── Delete Single Image ─────────────────────────────────────
exports.deleteImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const [galleries] = await promisePool.query(
      "SELECT * FROM galleries WHERE uuid = ? OR id = ?",
      [id, isNaN(Number(id)) ? -1 : Number(id)]
    );
    if (galleries.length === 0) {
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }

    const [images] = await promisePool.query(
      "SELECT * FROM gallery_images WHERE id = ? AND gallery_id = ?",
      [imageId, galleries[0].id]
    );
    if (images.length === 0) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    const image = images[0];

    await promisePool.query("DELETE FROM gallery_images WHERE id = ?", [image.id]);
    // Remove from the active store (Cloudinary or local) without blocking
    deleteAssetsQuietly([{ publicId: image.public_id, url: image.url }]);

    // Reassign cover if we just deleted it
    if (galleries[0].cover_image_url === image.url) {
      const [next] = await promisePool.query(
        "SELECT url FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1",
        [galleries[0].id]
      );
      await promisePool.query(
        "UPDATE galleries SET cover_image_url = ? WHERE id = ?",
        [next.length > 0 ? next[0].url : null, galleries[0].id]
      );
    }

    res.status(200).json({ success: true, message: "Image deleted" });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ success: false, message: "Failed to delete image" });
  }
};

// ─── Regenerate Share Token (kills old links) ────────────────
exports.regenerateToken = async (req, res) => {
  try {
    const { id } = req.params;
    const token = generateShareToken();

    const [result] = await promisePool.query(
      "UPDATE galleries SET share_token = ? WHERE uuid = ? OR id = ? AND status = 'active'",
      [token, id, isNaN(Number(id)) ? -1 : Number(id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }

    res.status(200).json({
      success: true,
      message: "New share link generated. The old link no longer works.",
      data: { share_token: token },
    });
  } catch (error) {
    console.error("Regenerate token error:", error);
    res.status(500).json({ success: false, message: "Failed to regenerate share link" });
  }
};

// ─── Delete Gallery (permanent) ──────────────────────────────
exports.deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;

    const [galleries] = await promisePool.query(
      "SELECT id FROM galleries WHERE uuid = ? OR id = ?",
      [id, isNaN(Number(id)) ? -1 : Number(id)]
    );

    if (galleries.length === 0) {
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }

    await destroyGallery(galleries[0].id);

    res.status(200).json({ success: true, message: "Gallery permanently deleted" });
  } catch (error) {
    console.error("Delete gallery error:", error);
    res.status(500).json({ success: false, message: "Failed to delete gallery" });
  }
};
