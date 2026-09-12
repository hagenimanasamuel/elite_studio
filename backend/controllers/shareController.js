const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const archiver = require("archiver");
const { promisePool } = require("../config/dbConfig");
const { computeStatus, publicMeta, destroyGallery } = require("../utils/galleryUtils");
const { streamToRes } = require("../utils/storageService");
const { GALLERY_DIR } = require("../middleware/upload");

// ─── Grant Tokens ────────────────────────────────────────────
// Short-lived signed token proving this visitor unlocked the gallery.
// Required as ?grant= on all download endpoints.
const signGrant = (gallery) =>
  jwt.sign({ gid: gallery.id, tok: gallery.share_token }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

const verifyGrant = (req, gallery) => {
  const header = req.headers.authorization || "";
  const grant = req.query.grant || header.replace("Bearer ", "");
  if (!grant) return false;
  try {
    const payload = jwt.verify(grant, process.env.JWT_SECRET);
    return String(payload.gid) === String(gallery.id) && payload.tok === gallery.share_token;
  } catch {
    return false;
  }
};

// ─── Load Gallery by Share Token ─────────────────────────────
const loadByToken = async (token) => {
  const [rows] = await promisePool.query(
    `SELECT g.*, COUNT(gi.id) AS image_count
       FROM galleries g
       LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
      WHERE g.share_token = ?
      GROUP BY g.id`,
    [token]
  );
  return rows[0] || null;
};

const logAccess = async (galleryId, action, req) => {
  try {
    await promisePool.query(
      "INSERT INTO gallery_access_logs (gallery_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)",
      [
        galleryId,
        action,
        req.ip || null,
        (req.headers["user-agent"] || "").slice(0, 255) || null,
      ]
    );
  } catch (err) {
    console.error("Access log error:", err.message);
  }
};

// ══════════════════════════════════════════════════════════════
// GET /api/share/:token — public preview info (no images)
// ══════════════════════════════════════════════════════════════
exports.getInfo = async (req, res) => {
  try {
    const gallery = await loadByToken(req.params.token);

    if (!gallery || gallery.status === "deleted") {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "This gallery link does not exist or has been removed",
      });
    }

    const liveStatus = computeStatus(gallery);

    res.status(200).json({
      success: true,
      data: {
        ...publicMeta(gallery),
        status: liveStatus,
        createdAt: gallery.created_at,
        studioName: "Elite Images Studio",
      },
    });
  } catch (error) {
    console.error("Share info error:", error);
    res.status(500).json({ success: false, message: "Failed to load gallery info" });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /api/share/:token/unlock — open gallery (+password check)
// Counts a view. Handles delete-after-view self-destruct.
// ══════════════════════════════════════════════════════════════
exports.unlock = async (req, res) => {
  try {
    const gallery = await loadByToken(req.params.token);

    if (!gallery || gallery.status === "deleted") {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "This gallery link does not exist or has been removed",
      });
    }

    // ─── Access Rules Enforcement ──────────────────────────────
    if (gallery.expires_at && new Date(gallery.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({
        success: false,
        code: "LINK_EXPIRED",
        message: "This gallery link has expired",
      });
    }

    if (
      gallery.max_views !== null &&
      Number(gallery.view_count || 0) >= Number(gallery.max_views)
    ) {
      return res.status(403).json({
        success: false,
        code: "VIEW_LIMIT_REACHED",
        message: "This gallery has reached its maximum number of views",
      });
    }

    // ─── Password Check ────────────────────────────────────────
    if (gallery.has_password) {
      const { password } = req.body || {};
      if (!password) {
        return res.status(401).json({
          success: false,
          code: "PASSWORD_REQUIRED",
          message: "This gallery is password protected",
        });
      }
      const match = await bcrypt.compare(String(password), gallery.password_hash || "");
      if (!match) {
        return res.status(401).json({
          success: false,
          code: "INVALID_PASSWORD",
          message: "Incorrect password. Please try again.",
        });
      }
    }

    // ─── Count View ────────────────────────────────────────────
    await promisePool.query(
      "UPDATE galleries SET view_count = view_count + 1, last_viewed_at = NOW() WHERE id = ?",
      [gallery.id]
    );
    await logAccess(gallery.id, "view", req);

    // ─── Fetch Images ──────────────────────────────────────────
    const [images] = await promisePool.query(
      `SELECT id, uuid, url, caption, mime_type FROM gallery_images
       WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC`,
      [gallery.id]
    );

    const grant = signGrant(gallery);
    const shouldSelfDestruct = !!gallery.delete_after_view;

    res.status(200).json({
      success: true,
      data: {
        ...publicMeta(gallery),
        images,
        grant,
        viewedOnce: true,
      },
    });

    // Self-destruct after the response has been delivered
    if (shouldSelfDestruct) {
      res.on("finish", () => {
        destroyGallery(gallery.id);
      });
    }
  } catch (error) {
    console.error("Unlock error:", error);
    res.status(500).json({ success: false, message: "Failed to open gallery" });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /api/share/:token/images/:imageId/download
// Single image download (permission + grant enforced)
// ══════════════════════════════════════════════════════════════
exports.downloadImage = async (req, res) => {
  try {
    const gallery = await loadByToken(req.params.token);

    if (!gallery || gallery.status === "deleted") {
      return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Gallery not found" });
    }
    if (computeStatus(gallery) !== "active") {
      return res.status(410).json({ success: false, code: "UNAVAILABLE", message: "This gallery is no longer available" });
    }
    if (!gallery.allow_download) {
      return res.status(403).json({ success: false, code: "DOWNLOAD_FORBIDDEN", message: "Downloads are not allowed for this gallery" });
    }
    if (!verifyGrant(req, gallery)) {
      return res.status(403).json({ success: false, code: "INVALID_GRANT", message: "Please re-open the gallery to continue" });
    }

    const [images] = await promisePool.query(
      "SELECT * FROM gallery_images WHERE id = ? AND gallery_id = ?",
      [req.params.imageId, gallery.id]
    );
    if (images.length === 0) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    const image = images[0];

    // Account the download
    await promisePool.query(
      "UPDATE gallery_images SET download_count = download_count + 1 WHERE id = ?",
      [image.id]
    );
    await promisePool.query(
      "UPDATE galleries SET download_count = download_count + 1 WHERE id = ?",
      [gallery.id]
    );
    await logAccess(gallery.id, "download", req);

    try {
      // Streams from Cloudinary (absolute URL) or local disk transparently
      await streamToRes(image, res, image.original_name || image.filename);
    } catch (streamErr) {
      console.error("Stream error:", streamErr.message);
      if (!res.headersSent) {
        res.status(404).json({ success: false, message: "File missing from storage" });
      }
    }

    // Self-destruct after first completed download
    if (gallery.delete_after_download) {
      res.on("finish", () => destroyGallery(gallery.id));
    }
  } catch (error) {
    console.error("Image download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Download failed" });
    }
  }
};

// ══════════════════════════════════════════════════════════════
// GET /api/share/:token/download-all — ZIP of every image
// ══════════════════════════════════════════════════════════════
exports.downloadAll = async (req, res) => {
  try {
    const gallery = await loadByToken(req.params.token);

    if (!gallery || gallery.status === "deleted") {
      return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Gallery not found" });
    }
    if (computeStatus(gallery) !== "active") {
      return res.status(410).json({ success: false, code: "UNAVAILABLE", message: "This gallery is no longer available" });
    }
    if (!gallery.allow_download) {
      return res.status(403).json({ success: false, code: "DOWNLOAD_FORBIDDEN", message: "Downloads are not allowed for this gallery" });
    }
    if (!verifyGrant(req, gallery)) {
      return res.status(403).json({ success: false, code: "INVALID_GRANT", message: "Please re-open the gallery to continue" });
    }

    const [images] = await promisePool.query(
      "SELECT * FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC",
      [gallery.id]
    );

    // With Cloudinary every URL is remote; locally we can check existence
    const available = images.filter((img) =>
      /^https?:\/\//i.test(img.url)
        ? true
        : require("fs").existsSync(path.join(GALLERY_DIR, path.basename(img.filename)))
    );

    if (available.length === 0) {
      return res.status(404).json({ success: false, message: "No files available to download" });
    }

    // Count one download event for the whole archive
    await promisePool.query(
      "UPDATE galleries SET download_count = download_count + 1 WHERE id = ?",
      [gallery.id]
    );
    await promisePool.query(
      "UPDATE gallery_images SET download_count = download_count + 1 WHERE gallery_id = ?",
      [gallery.id]
    );
    await logAccess(gallery.id, "download", req);

    const zipName = `${gallery.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "elite-gallery"}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    // Photos are already compressed — "store" mode is much faster
    const archive = archiver("zip", { store: true });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) res.status(500).end();
    });
    archive.pipe(res);

    const usedNames = new Set();
    available.forEach((img, i) => {
      let name = img.original_name || img.filename;
      if (usedNames.has(name)) {
        const ext = path.extname(name);
        name = `${path.basename(name, ext)}-${i + 1}${ext}`;
      }
      usedNames.add(name);

      if (/^https?:\/\//i.test(img.url)) {
        // Cloudinary: stream straight from storage into the archive
        const mod = img.url.toLowerCase().startsWith("https") ? require("https") : require("http");
        const upstream = mod.get(img.url, (res2) => {
          if (res2.statusCode !== 200) {
            archive.emit("error", new Error(`Storage returned ${res2.statusCode} for ${name}`));
            res2.resume();
            return;
          }
          archive.append(res2, { name });
        });
        upstream.on("error", (err) => archive.emit("error", err));
      } else {
        archive.file(path.join(GALLERY_DIR, path.basename(img.filename)), { name });
      }
    });

    archive.finalize();

    // Self-destruct after the archive has been fully delivered
    if (gallery.delete_after_download) {
      res.on("finish", () => destroyGallery(gallery.id));
    }
  } catch (error) {
    console.error("Zip download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to prepare download" });
    }
  }
};
