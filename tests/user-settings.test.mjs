import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import ts from "typescript";
import { migrateUserPreferences } from "../scripts/migrate-user-preferences.mjs";

const require = createRequire(import.meta.url);
function loadModule(path, dependencies = {}, clock = Date) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiled = { exports: {} };
  new Function("exports", "require", "Date", output)(
    compiled.exports,
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    clock,
  );
  return compiled.exports;
}
const helpers = loadModule("../src/lib/user-settings.ts");
const schema = loadModule("../src/db/schema.ts");

test("profile and password validation rejects malformed inputs and accepts boundary lengths", () => {
  for (const name of [null, {}, "", "   "]) assert.ok(helpers.profileNameError(name));
  assert.equal(helpers.profileNameError("  Nama Pengguna  "), null);
  assert.equal(helpers.profileNameError("a".repeat(80)), null);
  assert.ok(helpers.profileNameError("a".repeat(81)));
  assert.ok(helpers.passwordChangeError("", "new-pass", "new-pass"));
  assert.ok(helpers.passwordChangeError("old-pass", "short", "short"));
  assert.ok(helpers.passwordChangeError("old-pass", "new-pass", "typo"));
  assert.ok(helpers.passwordChangeError("old-pass", "old-pass", "old-pass"));
  assert.ok(helpers.passwordChangeError("old-pass", "a".repeat(129), "a".repeat(129)));
  assert.equal(helpers.passwordChangeError("old-pass", "new-pass", "new-pass"), null);
  assert.equal(helpers.passwordChangeError("old-pass", "a".repeat(128), "a".repeat(128)), null);
  for (const value of ["false", "true", 0, 1, null, undefined, {}])
    assert.ok(helpers.salaryEmailPreferenceError(value));
  assert.equal(helpers.salaryEmailPreferenceError(false), null);
  assert.equal(helpers.salaryEmailPreferenceError(true), null);
});

async function fixture(t) {
  const client = createClient({ url: "file::memory:" });
  t.after(() => client.close());
  await client.executeMultiple(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, email_verified INTEGER NOT NULL);
    CREATE TABLE accounts (user_id TEXT NOT NULL, provider_id TEXT NOT NULL, password TEXT);
    CREATE TABLE salary_settings (user_id TEXT NOT NULL, hourly_wage_yen INTEGER NOT NULL);
    CREATE TABLE attendance_records (
      id TEXT PRIMARY KEY, user_id TEXT, attendance_date TEXT, clock_in TEXT, clock_out TEXT,
      has_break INTEGER, break_count INTEGER, break1_from TEXT, break1_to TEXT, break2_from TEXT, break2_to TEXT,
      work_minutes INTEGER, hourly_wage_yen INTEGER, estimated_salary_yen INTEGER,
      payroll_period_start TEXT, payroll_period_end TEXT, status TEXT, created_at INTEGER, updated_at INTEGER
    );
    INSERT INTO users VALUES ('one', 'Fresh Name', 'one@example.test', 1), ('two', 'Second User', 'two@example.test', 0);
    INSERT INTO accounts VALUES ('one', 'credential', 'private-hash'), ('one', 'google', NULL), ('two', 'google', NULL);
    INSERT INTO salary_settings VALUES ('one', 1300);
  `);
  const migrate = () => migrateUserPreferences(client);
  await migrate();
  const db = drizzle(client, { schema });
  let sessionUser = "one";
  const invalidations = [];
  const actions = loadModule("../src/app/settings/actions.ts", {
    "@/db": { db }, "@/db/schema": schema, "@/lib/user-settings": helpers,
    "next/cache": { revalidatePath: (path) => invalidations.push(path) },
    "next/headers": { headers: async () => new Headers() },
    "@/lib/auth": { auth: { api: { getSession: async (options) => {
      assert.equal(options.query.disableCookieCache, true);
      return sessionUser ? { user: { id: sessionUser, name: "Stale Cookie Name" } } : null;
    } } } },
  });
  return { client, db, actions, migrate, invalidations, asUser: (user) => { sessionUser = user; } };
}

test("settings read fresh profile/provider data and default missing preference to enabled without exposing credentials", async (t) => {
  const { actions, asUser } = await fixture(t);
  assert.deepEqual(await actions.getUserSettings(), {
    name: "Fresh Name", email: "one@example.test", emailVerified: true,
    providers: ["credential", "google"], hasPassword: true, wage: 1300, salaryEmailEnabled: true,
  });
  asUser("two");
  assert.deepEqual(await actions.getUserSettings(), {
    name: "Second User", email: "two@example.test", emailVerified: false,
    providers: ["google"], hasPassword: false, wage: 1115, salaryEmailEnabled: true,
  });
});

test("email preference persists per authenticated user, survives repeated migration, and supports re-enabling", async (t) => {
  const { actions, asUser, migrate, invalidations, client } = await fixture(t);
  assert.deepEqual(await actions.saveEmailPreference(false), { success: true });
  await migrate();
  assert.equal((await actions.getUserSettings()).salaryEmailEnabled, false);
  asUser("two");
  assert.equal((await actions.getUserSettings()).salaryEmailEnabled, true);
  await actions.saveEmailPreference(true);
  asUser("one");
  assert.equal((await actions.getUserSettings()).salaryEmailEnabled, false);
  await actions.saveEmailPreference(true);
  assert.equal((await actions.getUserSettings()).salaryEmailEnabled, true);
  const rows = await client.execute("SELECT user_id FROM user_preferences");
  assert.equal(rows.rows.length, 2);
  assert.deepEqual(invalidations, ["/settings", "/settings", "/settings"]);
});

test("unauthenticated and invalid preference requests do not write settings", async (t) => {
  const { actions, asUser, client } = await fixture(t);
  for (const invalid of ["false", null, 0, { userId: "two", enabled: false }])
    assert.ok((await actions.saveEmailPreference(invalid)).error);
  asUser(null);
  await assert.rejects(actions.getUserSettings(), /Sesi berakhir/);
  assert.ok((await actions.saveEmailPreference(false)).error);
  assert.equal((await client.execute("SELECT user_id FROM user_preferences")).rows.length, 0);
});

class FirstOfMonth extends Date {
  constructor(...args) { super(...(args.length ? args : ["2026-10-01T02:00:00Z"])); }
  static now() { return new Date("2026-10-01T02:00:00Z").getTime(); }
}
async function cronFixture(t, options = {}) {
  const fixtureData = await fixture(t);
  await fixtureData.client.executeMultiple(`
    INSERT INTO attendance_records (id, user_id, attendance_date, clock_in, clock_out, has_break, break_count, work_minutes, estimated_salary_yen, status)
    VALUES ('a', 'one', '2026-09-23', '09:00', '18:00', 0, 0, 540, 11700, 'completed'),
           ('b', 'two', '2026-09-23', '09:00', '18:00', 0, 0, 540, 10035, 'completed');
  `);
  const sent = [];
  const route = loadModule("../src/app/api/cron/send-salary/route.ts", {
    "@/db": { db: fixtureData.db }, "@/db/schema": schema,
    "next/server": { NextResponse: { json: (value, init) => Response.json(value, init) } },
    "@/lib/utils": { getPayrollPeriod: () => ({ start: "2026-09-21", end: "2026-10-20" }) },
    "@/components/emails/salary-summary-email": { default: (props) => props },
    "@react-email/render": {
      render: async () => { await options.onRender?.(fixtureData); return "<p>Salary summary</p>"; },
      toPlainText: () => "Salary summary",
    },
    resend: { Resend: class {
      emails = { send: async (message) => { sent.push(message.to); return options.result ?? { data: { id: "test-delivery" }, error: null }; } };
    } },
  }, FirstOfMonth);
  // Local handler with a mocked email provider; no real messages or network requests.
  const run = () => route.GET(new Request("http://localhost/api/cron/send-salary", {
    headers: process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  }));
  return { ...fixtureData, sent, run };
}

test("cron excludes opted-out users while retaining users without preferences", async (t) => {
  const { actions, run, sent } = await cronFixture(t);
  await actions.saveEmailPreference(false);
  const response = await run();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sentCount, 1);
  assert.deepEqual(sent, ["two@example.test"]);
});

test("cron rechecks an opt-out made during rendering before sending", async (t) => {
  const { run, sent } = await cronFixture(t, {
    onRender: async ({ actions }) => { await actions.saveEmailPreference(false); },
  });
  const response = await run();
  assert.equal((await response.json()).sentCount, 1);
  assert.deepEqual(sent, ["two@example.test"]);
});

test("cron does not count email provider errors as successful delivery", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const { run } = await cronFixture(t, { result: { data: null, error: { message: "Rejected" } } });
  const response = await run();
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.equal(result.success, false);
  assert.equal(result.sentCount, 0);
  assert.equal(result.failedCount, 2);
  assert.equal(errors.mock.calls.length, 2);
});
