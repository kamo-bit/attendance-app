import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";

// The dev server must use the isolated local QA database and disabled mail/OAuth
// credentials. This script never reads environment files or contacts production.
const origin = "http://localhost:3000";
const target = new URL(origin);
if (
  target.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  target.port !== "3000" ||
  !process.argv.includes("--local-qa")
) {
  console.error("Run only against the isolated localhost:3000 QA server with --local-qa.");
  process.exit(1);
}

class LocalSession {
  cookies = new Map();

  async request(path, { method = "GET", json, bytes, headers = {} } = {}) {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin, "Requests must remain on the loopback QA origin.");
    const response = await fetch(url, {
      method,
      headers: {
        Origin: origin,
        Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "),
        ...(json === undefined ? {} : { "Content-Type": "application/json" }),
        ...(bytes === undefined ? {} : { "Content-Type": "application/octet-stream" }),
        ...headers,
      },
      body: json === undefined ? bytes : JSON.stringify(json),
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair, ...attributes] = cookie.split(";");
      const separator = pair.indexOf("=");
      if (separator < 1) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1);
      const expired = attributes.some((attribute) => {
        const normalized = attribute.trim().toLowerCase();
        if (normalized.startsWith("max-age=")) return Number(normalized.slice(8)) <= 0;
        if (normalized.startsWith("expires=")) return Date.parse(normalized.slice(8)) <= Date.now();
        return false;
      });
      if (expired || !value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return response;
  }

  async freshProfile() {
    const response = await this.request("/api/auth/get-session?disableCookieCache=true");
    assert.equal(response.status, 200, "Fresh session lookup must succeed.");
    return (await response.json())?.user;
  }
}

let passed = 0;
function pass(message) {
  passed += 1;
  console.log(`PASS ${message}`);
}

const one = new LocalSession();
const two = new LocalSession();
const endpoint = "/api/profile-photo";
try {
  const png = await sharp({ create: { width: 16, height: 12, channels: 3, background: "#158078" } }).png().toBuffer();
  const jpeg = await sharp({ create: { width: 12, height: 16, channels: 3, background: "#e8b45e" } }).jpeg().toBuffer();
  const anonymous = new LocalSession();
  for (const method of ["GET", "POST", "PUT"]) {
    assert.equal((await anonymous.request(endpoint, { method, ...(method === "GET" ? {} : { bytes: png }) })).status, 401);
  }
  pass("Anonymous photo access, preview, and save are rejected.");

  for (const session of [one, two]) {
    const signUp = await session.request("/api/auth/sign-up/email", {
      method: "POST",
      json: {
        name: "Foto QA Lokal",
        email: `photo-qa-${randomUUID()}@absenkuy.test`,
        password: `${randomBytes(24).toString("base64url")}Aa9!`,
      },
    });
    assert.equal(signUp.status, 200, "Disposable local sign-up must succeed.");
  }
  const original = await one.freshProfile();
  assert.ok(original?.id);
  assert.equal((await one.request(endpoint)).status, 404);
  pass("Two disposable local accounts are authenticated with no existing uploaded photos.");

  const preview = await one.request(endpoint, { method: "POST", bytes: png });
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("content-type"), "image/webp");
  const previewMetadata = await sharp(Buffer.from(await preview.arrayBuffer())).metadata();
  assert.equal(previewMetadata.format, "webp");
  assert.equal(previewMetadata.width, 256);
  assert.equal(previewMetadata.height, 256);
  assert.equal((await one.freshProfile()).image, original.image);
  assert.equal((await one.request(endpoint)).status, 404);
  pass("Preview produces a 256×256 WebP without saving it.");

  const save = await one.request(endpoint, { method: "PUT", bytes: png });
  assert.equal(save.status, 200);
  const firstImage = (await save.json()).image;
  assert.match(firstImage, /^\/api\/profile-photo\?v=[a-zA-Z0-9-]+$/);
  assert.equal((await one.freshProfile()).image, firstImage);
  const photo = await one.request(firstImage);
  assert.equal(photo.status, 200);
  assert.match(photo.headers.get("cache-control"), /private.*no-store/);
  assert.equal(photo.headers.get("x-content-type-options"), "nosniff");
  assert.equal(photo.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal((await sharp(Buffer.from(await photo.arrayBuffer())).metadata()).format, "webp");
  pass("Saved photo persists in the real auth session and private image response.");

  assert.equal((await two.request(`${firstImage}&userId=${encodeURIComponent(original.id)}`)).status, 404);
  assert.equal((await two.request(`${endpoint}?userId=${encodeURIComponent(original.id)}`)).status, 404);
  const secondSave = await two.request(`${endpoint}?userId=${encodeURIComponent(original.id)}`, { method: "PUT", bytes: jpeg });
  assert.equal(secondSave.status, 200);
  const secondImage = (await secondSave.json()).image;
  assert.equal((await two.freshProfile()).image, secondImage);
  assert.equal((await one.freshProfile()).image, firstImage);
  pass("Another account cannot access or replace the first account's photo by changing query parameters.");

  assert.equal((await one.request(endpoint, { method: "PUT", bytes: Buffer.from("invalid image") })).status, 400);
  assert.equal((await one.request(endpoint, { method: "PUT", bytes: Buffer.alloc(2 * 1024 * 1024 + 1) })).status, 413);
  assert.equal((await one.request(endpoint, { method: "PUT", bytes: jpeg, headers: { Origin: "https://untrusted.example" } })).status, 403);
  assert.equal((await one.freshProfile()).image, firstImage);
  assert.equal((await one.request(firstImage)).status, 200);
  pass("Invalid, oversized, and cross-origin uploads preserve the saved photo.");

  const replacement = await one.request(endpoint, { method: "PUT", bytes: jpeg });
  assert.equal(replacement.status, 200);
  const replacementImage = (await replacement.json()).image;
  assert.notEqual(replacementImage, firstImage);
  assert.equal((await one.freshProfile()).image, replacementImage);
  assert.equal((await one.request(firstImage)).status, 404);
  assert.equal((await one.request(replacementImage)).status, 200);
  pass("Replacing the photo updates the session and invalidates its previous version.");
  assert.equal((await one.request("/api/auth/sign-out", { method: "POST", json: {} })).status, 200);
  assert.equal((await one.request(replacementImage)).status, 401);
  pass("Signing out removes access to the saved photo.");
  console.log(`Profile photo integration: ${passed} checks passed (isolated local fixtures only).`);
} catch (error) {
  console.error(`FAIL Profile photo integration: ${error instanceof Error ? error.message : "Unknown failure"}`);
  process.exitCode = 1;
} finally {
  for (const session of [one, two]) {
    if (!session.cookies.size) continue;
    try { await session.request("/api/auth/sign-out", { method: "POST", json: {} }); }
    catch { /* The disposable QA account stays local even if the server stops. */ }
  }
}
