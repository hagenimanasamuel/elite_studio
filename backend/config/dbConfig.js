const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
});

const promisePool = pool.promise();

const executeQuery = async (sql, params = []) => {
  try {
    const [rows] = await promisePool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("❌ Database query error:", error);
    throw error;
  }
};

const tableExists = async (tableName) => {
  const sql = `
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = ? 
    AND table_name = ?
  `;
  const result = await executeQuery(sql, [process.env.DB_NAME, tableName]);
  return result[0].count > 0;
};

// ─── Lightweight Column Migration ────────────────────────────
// Adds a column when it is missing (safe to run on every boot).
const ensureColumn = async (table, column, definition) => {
  const sql = `
    SELECT COUNT(*) as count
    FROM information_schema.columns
    WHERE table_schema = ? AND table_name = ? AND column_name = ?
  `;
  const result = await executeQuery(sql, [process.env.DB_NAME, table, column]);
  if (result[0].count === 0) {
    await executeQuery(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
    console.log(`✅ Added column ${table}.${column}`);
  }
};

const createUsersTable = async () => {
  console.log("📦 Creating users table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('super_admin', 'admin', 'staff') DEFAULT 'staff',
      status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      is_active BOOLEAN DEFAULT 1,
      profile_image VARCHAR(255) NULL,
      profile_image_url TEXT NULL,
      phone_number VARCHAR(20) NULL,
      address TEXT NULL,
      reset_token VARCHAR(255) NULL,
      reset_token_expires DATETIME NULL,
      refresh_token VARCHAR(500) NULL,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_uuid (uuid),
      INDEX idx_role (role),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  console.log("✅ Users table created");
};

// ─── CREATE GALLERIES TABLE ──────────────────────────────────
const createGalleriesTable = async () => {
  console.log("📦 Creating galleries table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS galleries (
      id INT PRIMARY KEY AUTO_INCREMENT,
      uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
      share_token VARCHAR(32) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      created_by INT NULL,
      cover_image_url VARCHAR(500) NULL,
      has_password BOOLEAN DEFAULT 0,
      password_hash VARCHAR(255) NULL,
      allow_download BOOLEAN DEFAULT 0,
      expires_at DATETIME NULL,
      max_views INT UNSIGNED NULL,
      view_count INT UNSIGNED DEFAULT 0,
      download_count INT UNSIGNED DEFAULT 0,
      delete_after_view BOOLEAN DEFAULT 0,
      delete_after_download BOOLEAN DEFAULT 0,
      status ENUM('active', 'deleted') DEFAULT 'active',
      last_viewed_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_share_token (share_token),
      INDEX idx_status (status),
      INDEX idx_created_by (created_by),
      INDEX idx_created_at (created_at),
      CONSTRAINT fk_galleries_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  console.log("✅ Galleries table created");
};

// ─── CREATE GALLERY IMAGES TABLE ─────────────────────────────
const createGalleryImagesTable = async () => {
  console.log("📦 Creating gallery_images table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS gallery_images (
      id INT PRIMARY KEY AUTO_INCREMENT,
      uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
      gallery_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      url VARCHAR(500) NOT NULL,
      public_id VARCHAR(255) NULL,
      mime_type VARCHAR(100) NULL,
      size_bytes INT UNSIGNED DEFAULT 0,
      caption VARCHAR(255) NULL,
      sort_order INT DEFAULT 0,
      download_count INT UNSIGNED DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gallery (gallery_id),
      INDEX idx_sort (gallery_id, sort_order),
      CONSTRAINT fk_images_gallery FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  console.log("✅ Gallery images table created");
};

// ─── CREATE GALLERY ACCESS LOGS TABLE ────────────────────────
const createAccessLogsTable = async () => {
  console.log("📦 Creating gallery_access_logs table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS gallery_access_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      gallery_id INT NOT NULL,
      action ENUM('view', 'download') NOT NULL,
      ip_address VARCHAR(45) NULL,
      user_agent VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gallery_action (gallery_id, action),
      CONSTRAINT fk_logs_gallery FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  console.log("✅ Gallery access logs table created");
};

// ─── CREATE SITE CONTENT (CMS) TABLE ─────────────────────────
const createSiteContentTable = async () => {
  console.log("📦 Creating site_content table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS site_content (
      section VARCHAR(50) PRIMARY KEY,
      data JSON NOT NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  console.log("✅ Site content table created");
};

// ─── CREATE CONTACTS TABLE ─────────────────────────────────────
const createContactsTable = async () => {
  console.log("📦 Creating contacts table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS contacts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NULL,
      subject VARCHAR(255) NULL,
      message TEXT NOT NULL,
      status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_uuid (uuid),
      INDEX idx_status (status),
      INDEX idx_email (email),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  console.log("✅ Contacts table created");
};

const seedAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFullName = process.env.ADMIN_FULL_NAME || "System Administrator";
  const adminRole = process.env.ADMIN_ROLE || "super_admin";

  if (!adminEmail || !adminPassword) {
    console.log("⚠️  ADMIN_EMAIL and ADMIN_PASSWORD not set in .env. Skipping admin seed.");
    return;
  }

  try {
    const [existing] = await promisePool.execute(
      "SELECT * FROM users WHERE email = ?",
      [adminEmail]
    );

    if (existing.length > 0) {
      console.log("✅ Admin already exists");
      return;
    }

    console.log("🌱 Seeding admin user...");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await promisePool.execute(
      `INSERT INTO users (uuid, full_name, email, password, role, status, is_active, created_at)
       VALUES (UUID(), ?, ?, ?, ?, 'active', 1, NOW())`,
      [adminFullName, adminEmail, hashedPassword, adminRole]
    );

    console.log("✅ Admin seeded successfully");
  } catch (error) {
    console.error("❌ Admin seed error:", error.message);
  }
};

const initializeDatabase = async () => {
  try {
    console.log("🔌 Connecting to database...");
    const connection = await promisePool.getConnection();
    console.log("✅ Connected to MySQL database successfully");
    connection.release();

    console.log("📦 Checking database tables...");
    
    const usersExists = await tableExists("users");
    if (!usersExists) {
      await createUsersTable();
    } else {
      console.log("✓ Table is Ready: users");
    }

    const galleriesExists = await tableExists("galleries");
    if (!galleriesExists) {
      await createGalleriesTable();
    } else {
      console.log("✓ Table is Ready: galleries");
    }

    const galleryImagesExists = await tableExists("gallery_images");
    if (!galleryImagesExists) {
      await createGalleryImagesTable();
    } else {
      console.log("✓ Table is Ready: gallery_images");
    }
    await ensureColumn("gallery_images", "public_id", "VARCHAR(255) NULL");

    const accessLogsExists = await tableExists("gallery_access_logs");
    if (!accessLogsExists) {
      await createAccessLogsTable();
    } else {
      console.log("✓ Table is Ready: gallery_access_logs");
    }

    const siteContentExists = await tableExists("site_content");
    if (!siteContentExists) {
      await createSiteContentTable();
    } else {
      console.log("✓ Table is Ready: site_content");
    }

    const contactsExists = await tableExists("contacts");
if (!contactsExists) {
  await createContactsTable();
} else {
  console.log("✓ Table is Ready: contacts");
}

    await seedAdmin();
    console.log("🎉 Database initialization complete!");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    throw error;
  }
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

module.exports = {
  pool,
  promisePool,
  executeQuery,
  initializeDatabase,
  generateUUID,
  tableExists
};