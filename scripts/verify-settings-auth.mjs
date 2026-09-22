import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

// Run only after the dev server is configured with the isolated local QA database.
// No production URLs, real accounts, email flows, or environment files are used.
const base = new URL("http://localhost:3000");
if (
  base.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) ||
  base.port !== "3000" ||
  base.username ||
  base.password ||
  !process.argv.includes("--local-qa")
) {
  console.error("Run against the isolated localhost:3000 QA server with --local-qa.");
  process.exit(1);
}

class LocalSession {
  cookies = new Map();

  async request(path, body) {
    const url = new URL(`/api/auth/${path}`, base);
    assert.equal(url.origin, base.origin, "Requests must remain on the QA origin.");
    const headers = {
      Origin: base.origin,
      Accept: "application/json",
      Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "),
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Auth endpoint ${path} did not return JSON (${response.status}).`);
    }
    return { status: response.status, data };
  }
}

let passed = 0;
function pass(message) {
  passed += 1;
  console.log(`PASS ${message}`);
}

function expectStatus(result, status, message) {
  // Assert status alone so failures cannot accidentally print a session or password.
  assert.equal(result.status, status, message);
}

const primary = new LocalSession();
const secondary = new LocalSession();
const freshLogin = new LocalSession();
const email = `settings-qa-${randomUUID()}@absenkuy.test`;
const password = `${randomBytes(24).toString("base64url")}Aa9!`;
const newPassword = `${randomBytes(24).toString("base64url")}Bb8!`;

try {
  const anonymous = new LocalSession();
  expectStatus(await anonymous.request("update-user", { name: "Anonymous QA" }), 401, "Anonymous profile changes must fail.");
  expectStatus(await anonymous.request("change-password", { currentPassword: password, newPassword }), 401, "Anonymous password changes must fail.");
  pass("Anonymous profile and password changes are rejected.");

  expectStatus(await primary.request("sign-up/email", { name: "Pengguna QA", email, password }), 200, "Local disposable sign-up must succeed.");
  const initial = await primary.request("get-session?disableCookieCache=true");
  expectStatus(initial, 200, "Initial session lookup must succeed.");
  assert.ok(initial.data?.user?.id, "Sign-up must establish an authenticated session.");
  const userId = initial.data.user.id;
  pass("Disposable local account is authenticated.");

  expectStatus(await primary.request("update-user", { name: "  Nama Pengaturan QA  " }), 200, "Valid profile update must succeed.");
  const profile = await primary.request("get-session?disableCookieCache=true");
  expectStatus(profile, 200, "Fresh profile lookup must succeed.");
  assert.equal(profile.data?.user?.name, "Nama Pengaturan QA", "Name must be trimmed and persisted.");
  const cachedProfile = await primary.request("get-session");
  assert.equal(cachedProfile.data?.user?.name, "Nama Pengaturan QA", "Updated session cookie must reflect the new name.");
  pass("Profile name is trimmed, persisted, and reflected in the session.");

  expectStatus(await primary.request("update-user", { name: "A".repeat(80) }), 200, "An 80-character name must be accepted.");
  const boundaryProfile = await primary.request("get-session?disableCookieCache=true");
  assert.equal(boundaryProfile.data?.user?.name?.length, 80, "The full valid boundary name must be persisted.");
  expectStatus(await primary.request("update-user", { name: "Nama Pengaturan QA" }), 200, "QA name must be restored after boundary verification.");
  pass("An 80-character profile name is accepted.");

  for (const invalidName of ["", "   ", "A".repeat(81), null, 42, [], {}]) {
    const invalid = await primary.request("update-user", { name: invalidName });
    expectStatus(invalid, 400, "Empty or overlong names must be rejected server-side.");
    assert.equal(invalid.data?.code, "INVALID_NAME", "Invalid profile names must use a validation error.");
  }
  const unchanged = await primary.request("get-session?disableCookieCache=true");
  assert.equal(unchanged.data?.user?.name, "Nama Pengaturan QA", "Rejected name changes must preserve the profile.");
  pass("Blank, 81-character, and non-string names are rejected without changing the profile.");

  expectStatus(await secondary.request("sign-in/email", { email, password }), 200, "Second independent login must succeed.");
  const secondSession = await secondary.request("get-session?disableCookieCache=true");
  assert.ok(secondSession.data?.session, "Secondary session must exist before revocation.");

  const wrongPassword = await primary.request("change-password", {
    currentPassword: `${password}-wrong`, newPassword, revokeOtherSessions: true,
  });
  expectStatus(wrongPassword, 400, "Incorrect current password must be rejected.");
  assert.equal(wrongPassword.data?.code, "INVALID_PASSWORD", "Wrong current password must have the expected error.");
  pass("Incorrect current password is rejected.");

  const shortPassword = await primary.request("change-password", {
    currentPassword: password, newPassword: "short", revokeOtherSessions: true,
  });
  expectStatus(shortPassword, 400, "Short replacement password must be rejected.");
  assert.equal(shortPassword.data?.code, "PASSWORD_TOO_SHORT", "Short password must have the expected error.");
  pass("Too-short replacement password is rejected.");

  expectStatus(await primary.request("change-password", {
    currentPassword: password, newPassword, revokeOtherSessions: true,
  }), 200, "Valid password change must succeed.");
  const currentSession = await primary.request("get-session?disableCookieCache=true");
  assert.equal(currentSession.data?.user?.id, userId, "Current account must stay authenticated after password change.");
  pass("Password change succeeds and preserves the current login.");

  // Keep independent copies of the original cookies: a rejected request may clear
  // its cookie jar, which would hide stale-cookie authorization in later checks.
  const secondaryLookup = new LocalSession();
  secondaryLookup.cookies = new Map(secondary.cookies);
  const secondaryFreshLookup = new LocalSession();
  secondaryFreshLookup.cookies = new Map(secondary.cookies);
  expectStatus(await secondary.request("update-user", { name: "Revoked session QA" }), 401, "Revoked session must immediately lose permission to update the profile.");
  const revoked = await secondaryLookup.request("get-session");
  expectStatus(revoked, 200, "Normal revoked-session lookup must complete.");
  assert.equal(revoked.data, null, "Normal session lookup must not trust a revoked session's cached cookie.");
  const freshRevoked = await secondaryFreshLookup.request("get-session?disableCookieCache=true");
  assert.equal(freshRevoked.data, null, "Other session must be revoked in the backing store.");
  pass("Other session immediately loses profile access and both normal/fresh session lookups.");

  expectStatus(await new LocalSession().request("sign-in/email", { email, password }), 401, "Old password must no longer authenticate.");
  expectStatus(await freshLogin.request("sign-in/email", { email, password: newPassword }), 200, "New password must authenticate.");
  const updatedLogin = await freshLogin.request("get-session?disableCookieCache=true");
  assert.equal(updatedLogin.data?.user?.name, "Nama Pengaturan QA", "Profile changes must survive a fresh login.");
  pass("Old password fails; new password signs in with the saved profile.");

  expectStatus(await primary.request("sign-out", {}), 200, "Primary QA session must sign out.");
  expectStatus(await freshLogin.request("sign-out", {}), 200, "Fresh QA session must sign out.");
  console.log(`Settings auth integration: ${passed} checks passed (isolated local fixture only).`);
} catch (error) {
  console.error(`FAIL Settings auth integration: ${error instanceof Error ? error.message : "Unknown failure"}`);
  process.exitCode = 1;
}
