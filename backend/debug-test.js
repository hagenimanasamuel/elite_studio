require("dotenv").config({ quiet: true });
process.env.PORT = "3999";
const BASE = "http://localhost:3999";
(async () => {
  require("./server.js");
  for (let i = 0; i < 40; i++) { try { const r = await fetch(BASE + "/api/health"); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  const bcrypt = require("bcryptjs");
  const { promisePool } = require("./config/dbConfig");
  const E = "dbg2-" + Date.now() + "@t.local";
  await promisePool.query('INSERT INTO users (uuid,full_name,email,password,role,is_active) VALUES (UUID(),?,?,?,"super_admin",1)', ["D", E, bcrypt.hashSync("P123!", 10)]);
  const login = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E, password: "P123!" }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

  // What does the raw DB say?
  const [rows] = await promisePool.query("SELECT id, title, share_token, status FROM galleries ORDER BY id DESC LIMIT 5");
  console.log("DB GALLERIES:", JSON.stringify(rows));

  const fd = new FormData();
  fd.append("title", "ListDebug");
  fd.append("images", new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64")], { type: "image/png" }), "t.png");
  const created = await (await fetch(BASE + "/api/galleries", { method: "POST", headers: { Cookie: cookies }, body: fd })).json();
  console.log("CREATED id:", created.data && created.data.id);

  const listRes = await fetch(BASE + "/api/galleries", { headers: { Cookie: cookies } });
  console.log("LIST STATUS:", listRes.status);
  const listBody = await listRes.json();
  console.log("LIST KEYS:", Object.keys(listBody));
  console.log("LIST DATA LEN:", (listBody.data || []).length);
  console.log("LIST SAMPLE:", JSON.stringify((listBody.data || [])[0] || {}).slice(0, 300));
  console.log("LIST ERR?:", JSON.stringify(listBody.message || "").slice(0, 200));

  // ZIP diagnosis
  const tok = created.data.share_token;
  const un = await (await fetch(BASE + `/api/share/${tok}/unlock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
  const grant = encodeURIComponent(un.grant);
  const zip = await fetch(BASE + `/api/share/${tok}/download-all?grant=${grant}`);
  console.log("ZIP STATUS:", zip.status, "TYPE:", zip.headers.get("content-type"));
  const [imgRow] = await promisePool.query("SELECT filename, url FROM gallery_images WHERE gallery_id = ?", [created.data.id]);
  console.log("IMG ROWS:", JSON.stringify(imgRow));
  const fsSync = require("fs");
  const pathMod = require("path");
  const GALLERY_DIR = pathMod.join(__dirname, "uploads", "galleries");
  console.log("FILE EXISTS CHECK:", imgRow.map(r => r.filename + "=" + fsSync.existsSync(pathMod.join(GALLERY_DIR, r.filename))).join(","));
  process.exit(0);
})().catch(e => { console.error("ERR", e); process.exit(1); });
