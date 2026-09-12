const nodemailer = require("nodemailer");
require("dotenv").config();

// ─── Transport (only when SMTP fully configured) ─────────────
const smtpConfigured = () =>
  !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

let transporter = null;
if (smtpConfigured()) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ─── Send Email (returns {sent:boolean}) ─────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.log(`📧 [SMTP not configured] Would send "${subject}" to ${to}`);
    return { sent: false };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `Elite Images Studio <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
    });
    return { sent: true };
  } catch (err) {
    console.error("📧 Email send error:", err.message);
    return { sent: false };
  }
};

// ─── Password Reset Code Template ────────────────────────────
const sendResetCode = async (to, code, fullName) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;background:#0A0A0A;color:#E6F1FF;border-radius:12px;">
      <h2 style="color:#D4A373;">Elite Images Studio</h2>
      <p>Hi ${fullName || "there"},</p>
      <p>Your password reset code is:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#F5D76E;text-align:center;padding:16px;background:#1A1A1A;border-radius:8px;">${code}</p>
      <p style="color:#8892B0;">This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>`;
  const text = `Your Elite Images Studio password reset code is ${code}. It expires in 10 minutes.`;
  return sendEmail({
    to,
    subject: "Your Password Reset Code — Elite Images Studio",
    html,
    text,
  });
};

module.exports = { sendEmail, sendResetCode, smtpConfigured };
