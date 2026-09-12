const { promisePool } = require("../config/dbConfig");
const { formatBytes } = require("../utils/fileUtils");

// ─── Admin Dashboard Statistics ──────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [users] = await promisePool.query("SELECT COUNT(*) AS count FROM users");
    const [galleries] = await promisePool.query(
      "SELECT COUNT(*) AS total, " +
        "SUM(CASE WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN 1 ELSE 0 END) AS expired, " +
        "SUM(CASE WHEN has_password = 1 THEN 1 ELSE 0 END) AS protected, " +
        "COALESCE(SUM(view_count), 0) AS views, " +
        "COALESCE(SUM(download_count), 0) AS downloads " +
        "FROM galleries WHERE status = 'active'"
    );
    const [images] = await promisePool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(gi.size_bytes), 0) AS storage
         FROM gallery_images gi
         INNER JOIN galleries g ON g.id = gi.gallery_id
        WHERE g.status = 'active'`
    );
    const [contacts] = await promisePool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) AS unread
         FROM contacts`
    );

    // Recent galleries for the dashboard feed
    const [recentGalleries] = await promisePool.query(
      `SELECT g.id, g.uuid, g.share_token, g.title, g.cover_image_url, g.has_password,
              g.allow_download, g.expires_at, g.view_count, g.download_count, g.created_at,
              COUNT(gi.id) AS images_count
         FROM galleries g
         LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
        WHERE g.status = 'active'
        GROUP BY g.id
        ORDER BY g.created_at DESC
        LIMIT 6`
    );

    // Recent inquiries
    const [recentMessages] = await promisePool.query(
      `SELECT id, uuid, name, email, subject, status, created_at
         FROM contacts ORDER BY created_at DESC LIMIT 5`
    );

    // Views over the last 7 days (for the mini chart)
    const [viewsTrend] = await promisePool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS views
         FROM gallery_access_logs
        WHERE action = 'view' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY day ASC`
    );

    const storageBytes = Number(images[0].storage || 0);

    res.status(200).json({
      success: true,
      data: {
        users: Number(users[0].count),
        galleries: {
          total: Number(galleries[0].total || 0),
          expired: Number(galleries[0].expired || 0),
          protected: Number(galleries[0].protected || 0),
          views: Number(galleries[0].views || 0),
          downloads: Number(galleries[0].downloads || 0),
        },
        images: Number(images[0].count || 0),
        storage_bytes: storageBytes,
        storage_formatted: formatBytes(storageBytes),
        messages: {
          total: Number(contacts[0].total || 0),
          unread: Number(contacts[0].unread || 0),
        },
        recent_galleries: recentGalleries,
        recent_messages: recentMessages,
        views_trend: viewsTrend,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ success: false, message: "Failed to load statistics" });
  }
};
