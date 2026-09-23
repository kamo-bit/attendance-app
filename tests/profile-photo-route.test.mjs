import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import sharp from "sharp";
import ts from "typescript";
import { migrateProfilePhotos } from "../scripts/migrate-profile-photos.mjs";

const require = createRequire(import.meta.url);
const origin = "http://localhost:3000";
const maxBytes = 2 * 1024 * 1024;

function loadModule(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("exports", "require", output)(compiled.exports, (name) =>
    Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
  );
  return compiled.exports;
}

const schema = loadModule("../src/db/schema.ts");

function request(method, bytes, options = {}) {
  const headers = new Headers({ "x-qa-session": "isolated-local-session" });
  if (method !== "GET") {
    headers.set("origin", options.origin ?? origin);
    headers.set("content-type", options.contentType ?? "application/octet-stream");
  }
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    if (value === null) headers.delete(name);
    else headers.set(name, String(value));
  }
  return new Request(`${origin}/api/profile-photo${options.query ?? ""}`, {
    method,
    headers,
    body: bytes,
    ...(bytes instanceof ReadableStream ? { duplex: "half" } : {}),
  });
}

function stream(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

async function fixture(t) {
  const client = createClient({ url: "file::memory:" });
  t.after(() => client.close());
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
      email_verified INTEGER NOT NULL, image TEXT,
      created_at INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO users (id, name, email, email_verified, image)
    VALUES ('one', 'Pengguna Satu', 'one@example.test', 1, 'https://example.test/old-avatar.png'),
           ('two', 'Pengguna Dua', 'two@example.test', 1, NULL);
  `);
  await migrateProfilePhotos(client);
  const db = drizzle(client, { schema });
  const helper = loadModule("../src/lib/profile-photo.ts", { "server-only": {} });
  const normalizedInputs = [];
  let sessionUser = "one";
  let afterNormalize = () => {};
  const sessionCalls = [];
  const auth = { api: { getSession: async (options) => {
    assert.equal(options.query?.disableCookieCache, true, "Photo access must use a fresh session.");
    assert.equal(options.headers.get("x-qa-session"), "isolated-local-session", "Request headers must be forwarded to auth.");
    sessionCalls.push(sessionUser);
    if (!sessionUser) return null;
    const result = await client.execute({ sql: "SELECT id, image FROM users WHERE id = ?", args: [sessionUser] });
    return result.rows[0] ? { user: { ...result.rows[0] } } : null;
  } } };
  const route = loadModule("../src/app/api/profile-photo/route.ts", {
    "@/db": { db },
    "@/db/schema": schema,
    "@/lib/auth": { auth },
    "@/lib/profile-photo": {
      ...helper,
      normalizeProfilePhoto: async (bytes) => {
        normalizedInputs.push(bytes.length);
        const result = await helper.normalizeProfilePhoto(bytes);
        afterNormalize();
        return result;
      },
    },
    "next/cache": { revalidatePath: () => {} },
    "next/server": { NextResponse: { json: (value, init) => Response.json(value, init) } },
  });
  const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: "#158078" } }).png().toBuffer();
  const secondPng = await sharp({ create: { width: 6, height: 8, channels: 3, background: "#e8b45e" } }).png().toBuffer();
  const snapshot = async (user = "one") => {
    const photos = await client.execute({ sql: "SELECT data, version FROM profile_photos WHERE user_id = ?", args: [user] });
    const users = await client.execute({ sql: "SELECT image FROM users WHERE id = ?", args: [user] });
    return {
      image: users.rows[0]?.image,
      version: photos.rows[0]?.version ?? null,
      data: photos.rows[0] ? Buffer.from(photos.rows[0].data) : null,
    };
  };
  return { client, route, png, secondPng, snapshot, normalizedInputs, sessionCalls,
    asUser: (user) => { sessionUser = user; },
    afterNormalize: (callback) => { afterNormalize = callback; },
    freshSession: () => auth.api.getSession({ headers: new Headers({ "x-qa-session": "isolated-local-session" }), query: { disableCookieCache: true } }),
  };
}

test("profile photo endpoints reject unauthenticated requests without decoding or storing files", async (t) => {
  const { route, png, asUser, normalizedInputs, snapshot } = await fixture(t);
  asUser(null);
  for (const method of ["GET", "POST", "PUT"]) {
    const response = await route[method](request(method, method === "GET" ? undefined : png));
    assert.equal(response.status, 401);
  }
  assert.equal(normalizedInputs.length, 0);
  assert.equal((await snapshot()).version, null);
});

test("profile photo writes reject missing and cross-origin requests before decoding", async (t) => {
  const { route, png, normalizedInputs, snapshot } = await fixture(t);
  for (const method of ["POST", "PUT"]) {
    for (const options of [{ origin: "https://untrusted.example" }, { headers: { origin: null } }]) {
      assert.equal((await route[method](request(method, png, options))).status, 403);
    }
  }
  assert.equal(normalizedInputs.length, 0);
  assert.equal((await snapshot()).version, null);
});

test("preview converts the actual uploaded bytes to private WebP without changing stored profile data", async (t) => {
  const { route, png, snapshot } = await fixture(t);
  const before = await snapshot();
  const response = await route.POST(request("POST", png));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format, "webp");
  assert.deepEqual(await snapshot(), before);
});

test("save persists normalized bytes and versioned image URL visible to a fresh session and protected GET", async (t) => {
  const { route, png, snapshot, freshSession } = await fixture(t);
  const response = await route.PUT(request("PUT", png));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.image, /^\/api\/profile-photo\?v=[a-zA-Z0-9-]+$/);
  const saved = await snapshot();
  assert.equal(saved.image, result.image);
  assert.equal((await freshSession()).user.image, result.image);
  assert.equal(saved.version, new URL(result.image, origin).searchParams.get("v"));
  assert.equal((await sharp(saved.data).metadata()).format, "webp");
  const read = await route.GET(request("GET", undefined, { query: new URL(result.image, origin).search }));
  assert.equal(read.status, 200);
  assert.equal(read.headers.get("content-type"), "image/webp");
  assert.match(read.headers.get("cache-control"), /private/);
  assert.match(read.headers.get("cache-control"), /no-store/);
  assert.equal(read.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await read.arrayBuffer()), saved.data);
});

test("photo reads and writes are isolated by session even when userId and image version are tampered with", async (t) => {
  const { route, png, secondPng, asUser, snapshot } = await fixture(t);
  const oneSave = await route.PUT(request("PUT", png));
  const oneImage = (await oneSave.json()).image;
  const oneBefore = await snapshot("one");
  asUser("two");
  assert.equal((await route.GET(request("GET", undefined, { query: "?userId=one" }))).status, 404);
  const twoSave = await route.PUT(request("PUT", secondPng, { query: "?userId=one" }));
  assert.equal(twoSave.status, 200);
  const twoImage = (await twoSave.json()).image;
  assert.notEqual(twoImage, oneImage);
  assert.deepEqual(await snapshot("one"), oneBefore);
  const tamperedRead = await route.GET(request("GET", undefined, { query: "?userId=one" }));
  assert.equal(tamperedRead.status, 200);
  assert.deepEqual(Buffer.from(await tamperedRead.arrayBuffer()), (await snapshot("two")).data);
  const otherVersion = new URL(oneImage, origin).searchParams.get("v");
  assert.equal((await route.GET(request("GET", undefined, { query: `?v=${otherVersion}&userId=one` }))).status, 404);
});

test("replacing an image invalidates the previous version and keeps a single stored photo per user", async (t) => {
  const { route, png, secondPng, client } = await fixture(t);
  const first = await route.PUT(request("PUT", png));
  const firstImage = (await first.json()).image;
  const second = await route.PUT(request("PUT", secondPng));
  const secondImage = (await second.json()).image;
  assert.notEqual(secondImage, firstImage);
  assert.equal((await route.GET(request("GET", undefined, { query: new URL(firstImage, origin).search }))).status, 404);
  assert.equal((await route.GET(request("GET", undefined, { query: new URL(secondImage, origin).search }))).status, 200);
  assert.equal((await client.execute("SELECT user_id FROM profile_photos")).rows.length, 1);
});

test("declared and streamed uploads larger than 2 MiB are rejected before decoding, including absent or false content length", async (t) => {
  const { route, png, normalizedInputs, snapshot } = await fixture(t);
  for (const method of ["POST", "PUT"]) {
    assert.equal((await route[method](request(method, png, { headers: { "content-length": maxBytes + 1 } }))).status, 413);
    for (const headers of [{}, { "content-length": 1 }]) {
      const tooLarge = stream([new Uint8Array(maxBytes), new Uint8Array(1)]);
      assert.equal((await route[method](request(method, tooLarge, { headers }))).status, 413);
    }
  }
  assert.equal(normalizedInputs.length, 0);
  assert.equal((await snapshot()).version, null);
});

test("a valid chunked upload without content length can be previewed and saved", async (t) => {
  const { route, png } = await fixture(t);
  for (const method of ["POST", "PUT"]) {
    const chunked = stream([png.subarray(0, 10), png.subarray(10)]);
    const req = request(method, chunked);
    assert.equal(req.headers.has("content-length"), false);
    assert.equal((await route[method](req)).status, 200);
  }
});

test("invalid and empty files preserve an existing photo while declared MIME cannot spoof actual content", async (t) => {
  const { route, png, snapshot } = await fixture(t);
  assert.equal((await route.PUT(request("PUT", png))).status, 200);
  const before = await snapshot();
  for (const bytes of [Buffer.alloc(0), Buffer.from("not an image"), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')]) {
    for (const method of ["POST", "PUT"]) {
      assert.equal((await route[method](request(method, bytes))).status, 400);
      assert.deepEqual(await snapshot(), before);
    }
  }
  const spoofedContentType = await route.PUT(request("PUT", Buffer.from("not a png"), { contentType: "image/png" }));
  assert.equal(spoofedContentType.status, 400);
  assert.deepEqual(await snapshot(), before);
  const validUnrecognizedMime = await route.POST(request("POST", png, { contentType: "application/x-unknown" }));
  assert.equal(validUnrecognizedMime.status, 200);
  assert.deepEqual(await snapshot(), before);
});

test("a failed user-image update rolls back the photo replacement and returns a generic error", async (t) => {
  const { route, png, secondPng, client, snapshot } = await fixture(t);
  assert.equal((await route.PUT(request("PUT", png))).status, 200);
  const before = await snapshot();
  await client.execute(`CREATE TRIGGER reject_image_update BEFORE UPDATE OF image ON users
    BEGIN SELECT RAISE(ABORT, 'private-database-detail'); END`);
  t.mock.method(console, "error", () => {});
  const failed = await route.PUT(request("PUT", secondPng));
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /private-database-detail|SQLITE|UPDATE users|stack/i);
  assert.deepEqual(await snapshot(), before);
});

test("revocation or account switching during decoding prevents any profile write", async (t) => {
  const context = await fixture(t);
  const { route, png, secondPng, snapshot, asUser, afterNormalize } = context;
  assert.equal((await route.PUT(request("PUT", png))).status, 200);
  const oneBefore = await snapshot("one");
  const twoBefore = await snapshot("two");
  for (const nextUser of [null, "two"]) {
    asUser("one");
    afterNormalize(() => asUser(nextUser));
    assert.equal((await route.PUT(request("PUT", secondPng))).status, 401);
    assert.deepEqual(await snapshot("one"), oneBefore);
    assert.deepEqual(await snapshot("two"), twoBefore);
  }
});

test("repeated photo migration preserves existing photos and deletion cascades only to that user's photo", async (t) => {
  const { route, png, secondPng, snapshot, asUser, client } = await fixture(t);
  assert.equal((await route.PUT(request("PUT", png))).status, 200);
  const oneBefore = await snapshot("one");
  asUser("two");
  assert.equal((await route.PUT(request("PUT", secondPng))).status, 200);
  await migrateProfilePhotos(client);
  assert.deepEqual(await snapshot("one"), oneBefore);
  await client.execute("DELETE FROM users WHERE id = 'two'");
  assert.deepEqual((await client.execute("SELECT user_id FROM profile_photos")).rows.map((row) => row.user_id), ["one"]);
  assert.deepEqual(await snapshot("one"), oneBefore);
});

test("database read errors return private generic failures without database details", async (t) => {
  const { route, client } = await fixture(t);
  await client.execute("DROP TABLE profile_photos");
  t.mock.method(console, "error", () => {});
  const response = await route.GET(request("GET"));
  assert.equal(response.status, 500);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.doesNotMatch(await response.text(), /SQLITE|no such table|profile_photos|stack/i);
});
