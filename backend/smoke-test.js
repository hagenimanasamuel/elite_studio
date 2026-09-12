/* End-to-end smoke test — boots the real server and exercises every feature.
   Run: node smoke-test.js  (uses .env credentials, deletes its own data afterwards) */
process.env.PORT = process.env.PORT || 3999;
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");

const BASE = `http://localhost:${process.env.PORT}`;
let passed = 0;
let failed = 0;
const check = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  [OK]   ${name}`); }
  else { failed++; console.log(`  [FAIL] ${name} ${extra}`); }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHealthy() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

// Minimal valid 1x1 PNG
function makePng() {
  const buf = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  const tmp = path.join(__dirname, "uploads", "galleries", `smoke-${Date.now()}.png`);
  fs.writeFileSync(tmp, buf);
  return tmp;
}

(async () => {
  console.log("\n=== ELITE STUDIO SMOKE TEST ===\n");

  // 1. Boot
  process.stdout.write("Booting server...\n");
  require("./server.js");
  const healthy = await waitHealthy();
  check("Server healthy + DB connected", healthy);
  if (!healthy) process.exit(1);

  // 2. Seed a dedicated test admin straight into the DB
  const bcrypt = require("bcryptjs");
  const { promisePool } = require("./config/dbConfig");
  const TEST_EMAIL = `smoke-${Date.now()}@test.local`;
  await promisePool.query(
    "INSERT INTO users (uuid, full_name, email, password, role, is_active) VALUES (UUID(), 'Smoke Tester', ?, ?, 'super_admin', 1)",
    [TEST_EMAIL, bcrypt.hashSync("SmokePass123!", 10)]
  );

  // Admin login (cookie auth)
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: "SmokePass123!",
    }),
  });
  const loginBody = await loginRes.json();
  check("Admin login", loginRes.status === 200 && loginBody.success);

  // Collect cookies manually to prove tokens are issued
  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ");
  check("Auth cookies issued", cookieHeader.includes("accessToken") && cookieHeader.includes("refreshToken"));
  // Over plain HTTP the cookies must NOT carry the Secure attribute
  const accessCookie = setCookies.find((c) => c.startsWith("accessToken")) || "";
  check("Cookie NOT secure over HTTP (fix for 403 bug)", !accessCookie.includes("Secure"));

  const auth = { Cookie: cookieHeader };

  // 3. THE ORIGINAL BUG: /api/users must not 403 anymore
  const usersRes = await fetch(`${BASE}/api/users?page=1&limit=5`, { headers: auth });
  const usersBody = await usersRes.json().catch(() => ({}));
  check("GET /api/users returns 200 (was 403)", usersRes.status === 200, `got ${usersRes.status}`);

  // 4. Stats endpoint
  const statsRes = await fetch(`${BASE}/api/stats`, { headers: auth });
  check("GET /api/stats", statsRes.status === 200 && (await statsRes.json()).success);

  // 5. Content CMS round-trip
  const putContent = await fetch(`${BASE}/api/content/footer`, {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { socials: [{ platform: "Instagram", url: "https://instagram.com/test" }] } }),
  });
  check("PUT /api/content/footer", putContent.status === 200);
  const getContent = await fetch(`${BASE}/api/content`);
  const contentBody = await getContent.json();
  check("GET /api/content reflects edit", contentBody.data?.footer?.socials?.[0]?.platform === "Instagram");
  await fetch(`${BASE}/api/content/footer`, { method: "DELETE", headers: auth });

  // 6. Create gallery with an image upload
  const pngPath = makePng();
  const fd = new FormData();
  fd.append("title", "Smoke Test Gallery");
  fd.append("description", "Created by smoke-test.js");
  fd.append("allowDownload", "true");
  fd.append("expiresAt", "");
  fd.append("password", "test123");
  fd.append("maxViews", "10");
  fd.append("deleteAfterView", "false");
  fd.append("deleteAfterDownload", "false");
  fd.append("images", new Blob([fs.readFileSync(pngPath)], { type: "image/png" }), "photo-one.png");

  const createRes = await fetch(`${BASE}/api/galleries`, {
    method: "POST",
    headers: auth,
    body: fd,
  });
  const created = await createRes.json();
  check("POST /api/galleries (multipart upload)", createRes.status === 201 && created.success, JSON.stringify(created).slice(0, 200));
  const gallery = created.data;

  // 7. Gallery list shows it
  const listRes = await fetch(`${BASE}/api/galleries`, { headers: auth });
  const listBody = await listRes.json();
  const found = (listBody.data || []).find((g) => g.id === gallery.id);
  check("GET /api/galleries lists new gallery", !!found && Number(found.images_count) === 1);

  // 8. Public info (no auth) — password required flag
  const infoRes = await fetch(`${BASE}/api/share/${gallery.share_token}`);
  const infoBody = await infoRes.json();
  check("Public share info", infoRes.status === 200 && infoBody.data.requiresPassword === true && infoBody.data.imageCount === 1);

  // 9. Unlock with WRONG password
  const badUnlock = await fetch(`${BASE}/api/share/${gallery.share_token}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong" }),
  });
  const badBody = await badUnlock.json();
  check("Wrong password rejected", badUnlock.status === 401);
  check("INVALID_PASSWORD code", badBody.code === "INVALID_PASSWORD");

  // 10. Unlock with correct password
  const unlockRes = await fetch(`${BASE}/api/share/${gallery.share_token}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test123" }),
  });
  const unlocked = await unlockRes.json();
  check("Unlock success", unlockRes.status === 200 && Array.isArray(unlocked.data.images));
  check("Grant token issued", typeof unlocked.data.grant === "string" && unlocked.data.grant.length > 20);
  check("View counted", Number(unlocked.data.imageCount) >= 1);

  const imageId = unlocked.data.images[0].id;
  const grant = encodeURIComponent(unlocked.data.grant);

  // 11. Download blocked without grant
  const noGrant = await fetch(`${BASE}/api/share/${gallery.share_token}/images/${imageId}/download`, { redirect: "manual" });
  check("Download without grant forbidden", noGrant.status === 403);

  // 12. Download WITH grant
  const dlRes = await fetch(`${BASE}/api/share/${gallery.share_token}/images/${imageId}/download?grant=${grant}`);
  check("Single image download", dlRes.status === 200 && (dlRes.headers.get("content-type") || "").includes("image"));

  // 13. ZIP download
  const zipRes = await fetch(`${BASE}/api/share/${gallery.share_token}/download-all?grant=${grant}`);
  const zipBuf = Buffer.from(await zipRes.arrayBuffer());
  check("ZIP download", zipRes.status === 200 && zipBuf.length > 50 && zipBuf.slice(0, 2).toString() === "PK", `bytes=${zipBuf.length}`);

  // 14. Edit settings
  const updRes = await fetch(`${BASE}/api/galleries/${gallery.uuid}`, {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Renamed Gallery", allowDownload: false }),
  });
  const updated = await updRes.json();
  check("PUT gallery settings", updRes.status === 200 && updated.data.title === "Renamed Gallery" && updated.data.allow_download === 0);

  // 15. Downloads now blocked
  const dlBlocked = await fetch(`${BASE}/api/share/${gallery.share_token}/images/${imageId}/download?grant=${grant}`, { redirect: "manual" });
  check("Downloads blocked after allowDownload=false", dlBlocked.status === 403);

  // 16. Regenerate token kills old link
  const regen = await fetch(`${BASE}/api/galleries/${gallery.uuid}/regenerate-token`, { method: "POST", headers: auth });
  const regenBody = await regen.json();
  check("Regenerate token", regen.status === 200 && regenBody.data.share_token !== gallery.share_token);
  const oldLink = await fetch(`${BASE}/api/share/${gallery.share_token}`);
  check("Old link dead after regenerate", oldLink.status === 404);

  // 17. Delete gallery permanently
  const delRes = await fetch(`${BASE}/api/galleries/${gallery.uuid}`, { method: "DELETE", headers: auth });
  check("DELETE gallery", delRes.status === 200);
  const goneRes = await fetch(`${BASE}/api/galleries`, { headers: auth });
  const goneBody = await goneRes.json();
  check("Gallery removed from list", !(goneBody.data || []).some((g) => g.id === gallery.id));

  // cleanup temp png
  fs.unlinkSync(pngPath);

  // 18. Self-destruct test: delete-after-view
  const fd2 = new FormData();
  fd2.append("title", "Self Destruct Test");
  fd2.append("allowDownload", "false");
  fd2.append("deleteAfterView", "true");
  fd2.append("images", new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64")], { type: "image/png" }), "boom.png");
  const create2 = await (await fetch(`${BASE}/api/galleries`, { method: "POST", headers: auth, body: fd2 })).json();
  const tok2 = create2.data.share_token;
  const unlock2 = await fetch(`${BASE}/api/share/${tok2}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  check("Delete-after-view unlocks once", unlock2.status === 200);
  await sleep(1500); // give destroy a moment
  const afterDestroy = await fetch(`${BASE}/api/share/${tok2}`);
  check("Gallery self-destructed after view", afterDestroy.status === 404);

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);

  // Remove the test admin
  await promisePool.query("DELETE FROM users WHERE email = ?", [TEST_EMAIL]).catch(() => {});

  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error("SMOKE TEST CRASH:", err);
  process.exit(1);
});
