const fsPromises = require("fs").promises;
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { cloudinary, isCloudinaryEnabled } = require("../config/cloudinary");
const { GALLERY_DIR, SITE_DIR, UPLOADS_ROOT } = require("../middleware/upload");

// ─── Active Driver ───────────────────────────────────────────
// "cloudinary" when credentials exist in .env, otherwise local disk.
const activeDriver = () => (isCloudinaryEnabled() ? "cloudinary" : "local");

const folderDir = (folder) => (folder === "site" ? SITE_DIR : GALLERY_DIR);

// ─── Upload ──────────────────────────────────────────────────
// Multer writes a temp file first; this moves it to the active store.
// Returns { url, publicId, size } — url is absolute for Cloudinary,
// relative ("/uploads/...") for local storage.
async function putFile(tempPath, { folder = "galleries" } = {}) {
  const stat = await fsPromises.stat(tempPath);
  const size = stat.size;

  if (activeDriver() === "cloudinary") {
    const result = await cloudinary.uploader.upload(tempPath, {
      folder: `elite-images/${folder}`,
      resource_type: "image",
    });
    // Remove the temp file — Cloudinary is now the source of truth
    await fsPromises.unlink(tempPath).catch(() => {});
    return { url: result.secure_url, publicId: result.public_id, size };
  }

  // Local mode: keep the file inside the uploads tree
  const destDir = folderDir(folder);
  const finalName = path.basename(tempPath);
  const destPath = path.join(destDir, finalName);
  if (path.resolve(tempPath) !== path.resolve(destPath)) {
    await fsPromises.rename(tempPath, destPath).catch(async () => {
      await fsPromises.copyFile(tempPath, destPath);
      await fsPromises.unlink(tempPath);
    });
  }
  return { url: `/uploads/${folder}/${finalName}`, publicId: null, size };
}

// ─── Delete ──────────────────────────────────────────────────
async function deleteAsset({ publicId, url }) {
  if (activeDriver() === "cloudinary") {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error(`⚠️  Cloudinary destroy failed (${publicId}):`, err.message);
    }
    return;
  }
  // Local mode
  if (!url) return;
  const relative = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : `galleries/${path.basename(url)}`;
  const target = path.join(UPLOADS_ROOT, path.normalize(relative).replace(/^(\.\.[\/\\])+/, ""));
  try {
    if (fs.existsSync(target)) await fsPromises.unlink(target);
  } catch (err) {
    console.error(`⚠️  Local delete failed (${target}):`, err.message);
  }
}

// Bulk delete without blocking callers
function deleteAssetsQuietly(assets) {
  (assets || []).forEach((a) => {
    deleteAsset(a).catch(() => {});
  });
}

// ─── Stream to Response (downloads) ─────────────────────────
// Works with both absolute URLs (Cloudinary) and local files.
const contentDisposition = (name) => {
  const fallback = String(name || "download")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/"/g, "'");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

function streamToRes({ url }, res, filename) {
  return new Promise((resolve, reject) => {
    if (/^https?:\/\//i.test(url)) {
      const mod = url.toLowerCase().startsWith("https") ? https : http;
      const req = mod.get(url, { headers: { Accept: "*/*" } }, (upstream) => {
        if (upstream.statusCode !== 200) {
          upstream.resume();
          return reject(new Error(`Storage returned ${upstream.statusCode}`));
        }
        res.setHeader("Content-Type", upstream.headers["content-type"] || "application/octet-stream");
        res.setHeader("Content-Length", upstream.headers["content-length"] || "");
        if (filename) res.setHeader("Content-Disposition", contentDisposition(filename));
        upstream.pipe(res);
        upstream.on("end", resolve);
        upstream.on("error", reject);
      });
      req.on("error", reject);
      return;
    }

    // Local file streaming
    const relative = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : null;
    const filePath = relative
      ? path.join(UPLOADS_ROOT, path.normalize(relative).replace(/^(\.\.[\/\\])+/, ""))
      : null;

    if (!filePath || !fs.existsSync(filePath)) {
      return reject(new Error("File missing from storage"));
    }

    res.setHeader("Content-Type", guessMime(filePath));
    if (filename) res.setHeader("Content-Disposition", contentDisposition(filename));
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on("end", resolve);
    stream.on("error", reject);
  });
}

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  };
  return map[ext] || "application/octet-stream";
}

module.exports = { activeDriver, putFile, deleteAsset, deleteAssetsQuietly, streamToRes };
