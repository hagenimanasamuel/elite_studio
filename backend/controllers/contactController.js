const { promisePool } = require("../config/dbConfig");
const { generateUUID } = require("../config/dbConfig");

// ─── Submit Contact Message ─────────────────────────────────────
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, message, subject } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required",
      });
    }

    const uuid = generateUUID();

    const [result] = await promisePool.query(
      `INSERT INTO contacts (uuid, name, email, phone, subject, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'unread', NOW())`,
      [uuid, name, email, phone || null, subject || 'General Inquiry', message]
    );

    const [newContact] = await promisePool.query(
      `SELECT id, uuid, name, email, phone, subject, message, status, created_at
       FROM contacts WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newContact[0],
    });
  } catch (error) {
    console.error("Submit contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

// ─── Get All Contact Messages (Admin only) ────────────────────
exports.getAllContacts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT id, uuid, name, email, phone, subject, message, status, created_at
      FROM contacts 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR subject LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Count total
    const countSql = sql.replace(
      "SELECT id, uuid, name, email, phone, subject, message, status, created_at FROM contacts",
      "SELECT COUNT(*) as total FROM contacts"
    );
    const [countResult] = await promisePool.query(countSql, params);
    const total = countResult.total;

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [contacts] = await promisePool.query(sql, params);

    res.status(200).json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

// ─── Get Single Contact Message ────────────────────────────────
exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const [contacts] = await promisePool.query(
      `SELECT id, uuid, name, email, phone, subject, message, status, created_at
       FROM contacts WHERE id = ? OR uuid = ?`,
      [id, id]
    );

    if (contacts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Mark as read if currently unread
    if (contacts[0].status === 'unread') {
      await promisePool.query(
        "UPDATE contacts SET status = 'read', read_at = NOW() WHERE id = ?",
        [contacts[0].id]
      );
      contacts[0].status = 'read';
    }

    res.status(200).json({
      success: true,
      data: contacts[0],
    });
  } catch (error) {
    console.error("Get contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch message",
    });
  }
};

// ─── Update Contact Status ─────────────────────────────────────
exports.updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['unread', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const [existing] = await promisePool.query(
      "SELECT * FROM contacts WHERE id = ? OR uuid = ?",
      [id, id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    await promisePool.query(
      "UPDATE contacts SET status = ? WHERE id = ?",
      [status, existing[0].id]
    );

    const [updatedContact] = await promisePool.query(
      `SELECT id, uuid, name, email, phone, subject, message, status, created_at
       FROM contacts WHERE id = ?`,
      [existing[0].id]
    );

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: updatedContact[0],
    });
  } catch (error) {
    console.error("Update contact status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

// ─── Delete Contact Message ─────────────────────────────────────
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await promisePool.query(
      "SELECT * FROM contacts WHERE id = ? OR uuid = ?",
      [id, id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    await promisePool.query(
      "DELETE FROM contacts WHERE id = ?",
      [existing[0].id]
    );

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};