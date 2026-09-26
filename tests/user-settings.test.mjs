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
const attendance = loadModule("../src/lib/attendance.ts");
const salaryEstimates = loadModule("../src/lib/salary-estimate.ts", { "./attendance": attendance });
const payrollUtils = loadModule("../src/lib/utils.ts", { "./attendance": attendance });

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
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, email_verified INTEGER NOT NULL, image TEXT);
    CREATE TABLE accounts (user_id TEXT NOT NULL, provider_id TEXT NOT NULL, password TEXT);
    CREATE TABLE salary_settings (user_id TEXT NOT NULL, hourly_wage_yen INTEGER NOT NULL);
    CREATE TABLE attendance_records (
      id TEXT PRIMARY KEY, user_id TEXT, attendance_date TEXT, clock_in TEXT, clock_out TEXT,
      has_break INTEGER, break_count INTEGER, break1_from TEXT, break1_to TEXT, break2_from TEXT, break2_to TEXT,
      work_minutes INTEGER, hourly_wage_yen INTEGER, estimated_salary_yen INTEGER,
      payroll_period_start TEXT, payroll_period_end TEXT, status TEXT, created_at INTEGER, updated_at INTEGER
    );
    INSERT INTO users VALUES ('one', 'Fresh Name', 'one@example.test', 1, NULL), ('two', 'Second User', 'two@example.test', 0, NULL);
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
    name: "Fresh Name", email: "one@example.test", emailVerified: true, image: null,
    providers: ["credential", "google"], hasPassword: true, wage: 1300, salaryEmailEnabled: true,
  });
  asUser("two");
  assert.deepEqual(await actions.getUserSettings(), {
    name: "Second User", email: "two@example.test", emailVerified: false, image: null,
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

function clockAt(iso) {
  return class extends Date {
    constructor(...args) { super(...(args.length ? args : [iso])); }
    static now() { return new Date(iso).getTime(); }
  };
}
async function cronFixture(t, options = {}) {
  const fixtureData = await fixture(t);
  if (options.seedRecords !== false) await fixtureData.client.executeMultiple(`
    INSERT INTO attendance_records (id, user_id, attendance_date, clock_in, clock_out, has_break, break_count, work_minutes, estimated_salary_yen, status)
    VALUES ('a', 'one', '2026-09-18', '09:00', '18:00', 0, 0, 540, 11700, 'completed'),
           ('b', 'two', '2026-09-18', '09:00', '18:00', 0, 0, 540, 10035, 'completed');
  `);
  const sent = [];
  const messages = [];
  const rendered = [];
  const deliveryOptions = [];
  const route = loadModule("../src/app/api/cron/send-salary/route.ts", {
    "@/db": { db: fixtureData.db }, "@/db/schema": schema,
    "next/server": { NextResponse: { json: (value, init) => Response.json(value, init) } },
    "@/lib/utils": payrollUtils,
    "@/lib/salary-estimate": salaryEstimates,
    "@/components/emails/salary-summary-email": { default: (props) => props },
    "@react-email/render": {
      render: async (props) => { rendered.push(props); await options.onRender?.(fixtureData); return "<p>Salary summary</p>"; },
      toPlainText: () => "Salary summary",
    },
    resend: { Resend: class {
      emails = { send: async (message, settings) => { sent.push(message.to); messages.push(message); deliveryOptions.push(settings); return options.result ?? { data: { id: "test-delivery" }, error: null }; } };
    } },
  }, clockAt(options.now ?? "2026-10-01T02:00:00Z"));
  // Local handler with a mocked email provider; no real messages or network requests.
  const run = () => route.GET(new Request("http://localhost/api/cron/send-salary", {
    headers: process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  }));
  return { ...fixtureData, sent, messages, rendered, deliveryOptions, run };
}

for (const [now, start, end] of [
  ["2026-09-30T15:00:00Z", "2026-08-21", "2026-09-20"],
  ["2026-12-31T15:00:00Z", "2026-11-21", "2026-12-20"],
  ["2027-01-31T15:00:00Z", "2026-12-21", "2027-01-20"],
  ["2026-02-28T15:00:00Z", "2026-01-21", "2026-02-20"],
  ["2028-02-29T15:00:00Z", "2028-01-21", "2028-02-20"],
]) {
  test(`salary email at ${now} uses the closed period ${start} through ${end}`, async (t) => {
    const { client, run, sent, messages, rendered, deliveryOptions } = await cronFixture(t, { now, seedRecords: false });
    const beforeStart = start.slice(0, 8) + "20";
    const afterEnd = end.slice(0, 8) + "21";
    // Include both edges, but exclude adjacent periods and unfinished/deleted records.
    for (const [id, date, status, minutes, salary] of [
      ["end", end, "completed", 120, 2600],
      ["before", beforeStart, "completed", 999, 99999],
      ["start", start, "completed", 60, 1300],
      ["after", afterEnd, "completed", 999, 99999],
      ["draft", start.slice(0, 8) + "22", "draft", 999, 99999],
      ["deleted", start.slice(0, 8) + "23", "deleted", 999, 99999],
    ]) {
      await client.execute({
        sql: "INSERT INTO attendance_records (id, user_id, attendance_date, clock_in, clock_out, has_break, break_count, work_minutes, estimated_salary_yen, status) VALUES (?, 'one', ?, '09:00', '11:00', 0, 0, ?, ?, ?)",
        args: [id, date, minutes, salary, status],
      });
    }
    const response = await run();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true, message: `Salary email run finished for period ${start} to ${end}`,
      sentCount: 1, failedCount: 0,
    });
    assert.deepEqual(sent, ["one@example.test"]);
    assert.equal(rendered.length, 1);
    const props = rendered[0];
    assert.deepEqual(props.records.map((r) => r.date), [start, end]);
    assert.equal(props.totalWorkDays, 2);
    assert.equal(props.totalWorkHours, "3 jam 0 menit");
    assert.equal(props.totalSalary, "¥3.900");
    assert.equal(props.estimate.totalDeductions, 55400);
    assert.equal(props.estimate.net, 3900 - 55400);
    assert.equal(props.estimate.draftCount, 1);
    assert.equal(props.estimate.status, "ready");
    assert.equal(deliveryOptions[0].idempotencyKey, `salary-summary/one/${end.slice(0, 7)}`);
    const label = new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    }).formatRange(new Date(start + "T00:00:00Z"), new Date(end + "T00:00:00Z"));
    assert.equal(props.period, label);
    assert.equal(messages[0].subject, `Ringkasan Pendapatan — ${label}`);
    assert.equal(new URL(props.summaryUrl).pathname, "/salary-summary");
    assert.equal(new URL(props.summaryUrl).searchParams.get("period"), end.slice(0, 7));
    assert.equal(new URL(props.summaryUrl).searchParams.has("date"), false);
  });
}

for (const now of ["2026-09-30T14:59:59Z", "2026-10-01T15:00:00Z"]) {
  test(`salary email skips ${now} because it is not the first day in Japan`, async (t) => {
    const { run, sent, rendered } = await cronFixture(t, { now });
    const response = await run();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.sentCount, 0);
    assert.match(result.message, /Skipped/);
    assert.deepEqual(sent, []);
    assert.deepEqual(rendered, []);
  });
}

test("salary email skips users with records only in the ongoing period", async (t) => {
  const { client, run, sent } = await cronFixture(t);
  await client.execute("UPDATE attendance_records SET attendance_date = '2026-09-21'");
  const response = await run();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sentCount, 0);
  assert.deepEqual(sent, []);
});

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
