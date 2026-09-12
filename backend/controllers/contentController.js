const { promisePool } = require("../config/dbConfig");
const { putFile } = require("../utils/storageService");

// ─── Editable Sections Whitelist ─────────────────────────────
const SECTIONS = [
  "hero",
  "about",
  "services",
  "gallery",
  "testimonials",
  "contact",
  "footer",
];

// ─── Get All Site Content (public) ───────────────────────────
exports.getContent = async (req, res) => {
  try {
    const [rows] = await promisePool.query("SELECT section, data FROM site_content");
    const content = {};
    rows.forEach((row) => {
      try {
        content[row.section] =
          typeof row.data === "string" ? JSON.parse(row.data) : row.data;
      } catch {
        // Skip malformed rows
      }
    });
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    console.error("Get content error:", error);
    res.status(500).json({ success: false, message: "Failed to load site content" });
  }
};

// ─── Get Single Section ──────────────────────────────────────
exports.getSection = async (req, res) => {
  try {
    const { section } = req.params;
    if (!SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, message: "Unknown section" });
    }
    const [rows] = await promisePool.query(
      "SELECT data FROM site_content WHERE section = ?",
      [section]
    );
    res.status(200).json({
      success: true,
      data: rows.length > 0 ? (typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data) : null,
    });
  } catch (error) {
    console.error("Get section error:", error);
    res.status(500).json({ success: false, message: "Failed to load section" });
  }
};

// ─── Upsert Section (admin) ──────────────────────────────────
exports.updateSection = async (req, res) => {
  try {
    const { section } = req.params;
    if (!SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, message: `Unknown section "${section}"` });
    }

    const payload = req.body?.data ?? req.body;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ success: false, message: "Invalid content payload — expected an object" });
    }

    const json = JSON.stringify(payload);

    await promisePool.query(
      `INSERT INTO site_content (section, data, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by)`,
      [section, json, req.user?.id || null]
    );

    res.status(200).json({
      success: true,
      message: `"${section}" section saved successfully`,
      data: payload,
    });
  } catch (error) {
    console.error("Update section error:", error);
    res.status(500).json({ success: false, message: "Failed to save section" });
  }
};

// ─── Reset Section to Null (= frontend defaults) ─────────────
exports.resetSection = async (req, res) => {
  try {
    const { section } = req.params;
    if (!SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, message: "Unknown section" });
    }
    await promisePool.query("DELETE FROM site_content WHERE section = ?", [section]);
    res.status(200).json({ success: true, message: `"${section}" reset to defaults` });
  } catch (error) {
    console.error("Reset section error:", error);
    res.status(500).json({ success: false, message: "Failed to reset section" });
  }
};

// ─── Upload CMS Image (hero/about/testimonial avatars/etc.) ──
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    // Goes to Cloudinary when configured, otherwise local uploads
    const uploaded = await putFile(req.file.path, { folder: "site" });

    res.status(201).json({
      success: true,
      message: "Image uploaded",
      data: {
        url: uploaded.url,
        public_id: uploaded.publicId,
        original_name: req.file.originalname,
        size: uploaded.size,
      },
    });
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};
