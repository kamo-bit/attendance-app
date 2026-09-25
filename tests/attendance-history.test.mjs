import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadModule(path, dependencies = {}) {
  const output = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const compiled = { exports: {} };
  new Function("exports", "require", output)(compiled.exports, (name) =>
    Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
  );
  return compiled.exports;
}
const attendance = loadModule("../src/lib/attendance.ts");
const history = loadModule("../src/lib/attendance-history.ts", {
  "./attendance": attendance,
});
const schema = loadModule("../src/db/schema.ts");
const {
  defaultHistoryFilters: defaults,
  filterAttendanceHistory: filter,
  historyRangeError,
} = history;
const sample = (id, date, status, updated = "2026-09-25T00:00:00Z") => ({
  id,
  attendanceDate: date,
  status,
  createdAt: new Date("2026-09-25T00:00:00Z"),
  updatedAt: new Date(updated),
});
const records = [
  sample("old", "2026-08-31", "completed", "2026-09-29T00:00:00Z"),
  sample("draft", "2026-09-21", "draft"),
  sample("done", "2026-09-22", "completed"),
  sample("deleted", "2026-09-22", "deleted", "2026-09-26T00:00:00Z"),
];
const ids = (items) => items.map((item) => item.id);

test("history filters statuses independently of activity and includes both date boundaries", () => {
  assert.deepEqual(ids(filter(records, { ...defaults, status: "draft" })), [
    "draft",
  ]);
  assert.deepEqual(
    ids(
      filter(records, { ...defaults, status: "completed", activity: "Diubah" }),
    ),
    ["old"],
  );
  assert.deepEqual(ids(filter(records, { ...defaults, status: "deleted" })), [
    "deleted",
  ]);
  assert.deepEqual(
    ids(
      filter(records, {
        ...defaults,
        from: "2026-09-21",
        to: "2026-09-22",
        activity: "Dibuat",
      }),
    ),
    ["done", "draft"],
  );
  assert.equal(
    filter(records, { ...defaults, from: "2026-09-22", to: "2026-09-22" })
      .length,
    2,
  );
});
test("history supports one-sided ranges, month filters, and empty/invalid results", () => {
  assert.equal(filter(records, { ...defaults, from: "2026-09-22" }).length, 2);
  assert.deepEqual(ids(filter(records, { ...defaults, to: "2026-08-31" })), [
    "old",
  ]);
  assert.equal(filter(records, { ...defaults, month: "2026-09" }).length, 3);
  assert.deepEqual(filter(records, { ...defaults, from: "2027-01-01" }), []);
  for (const dates of [
    { from: "2026-02-30" },
    { to: "invalid" },
    { from: "2026-09-23", to: "2026-09-22" },
  ]) {
    assert.ok(historyRangeError({ ...defaults, ...dates }));
    assert.deepEqual(filter(records, { ...defaults, ...dates }), []);
  }
});
test("work-date sorting is independent of updates, deterministic, and does not mutate records", () => {
  const original = [...records];
  assert.deepEqual(ids(filter(records, defaults)), [
    "deleted",
    "done",
    "draft",
    "old",
  ]);
  assert.deepEqual(ids(filter(records, { ...defaults, sort: "date-asc" })), [
    "old",
    "draft",
    "deleted",
    "done",
  ]);
  assert.deepEqual(
    ids(filter(records, { ...defaults, sort: "updated-desc" })),
    ["old", "deleted", "done", "draft"],
  );
  const tied = [
    sample("b", "2026-09-22", "draft"),
    sample("a", "2026-09-22", "deleted"),
  ];
  assert.deepEqual(ids(filter(tied, defaults)), ["a", "b"]);
  assert.deepEqual(records, original);
});

async function fixture(t) {
  // Transactions open separate native connections; :memory: would lose the schema.
  // Native transaction handles can outlive close() on Windows, so keep the fixture in OS temp.
  const client = createClient({
    url: pathToFileURL(join(tmpdir(), `absenkuy-history-${randomUUID()}.db`))
      .href,
  });
  t.after(() => client.close());
  await client.executeMultiple(`
    CREATE TABLE attendance_records (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, attendance_date TEXT NOT NULL, clock_in TEXT, clock_out TEXT,
      has_break INTEGER, break_count INTEGER, break1_from TEXT, break1_to TEXT, break2_from TEXT, break2_to TEXT,
      work_minutes INTEGER, hourly_wage_yen INTEGER, estimated_salary_yen INTEGER,
      payroll_period_start TEXT, payroll_period_end TEXT, status TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE salary_settings (id TEXT, user_id TEXT, hourly_wage_yen INTEGER, effective_from TEXT, created_at INTEGER, updated_at INTEGER);
    INSERT INTO salary_settings VALUES ('rate', 'one', 1500, '2026-09-01', 1, 1);
  `);
  const db = drizzle(client, { schema });
  let sessionUser = "one";
  const invalidations = [];
  const actions = loadModule("../src/app/actions.ts", {
    "@/db": { db },
    "@/db/schema": schema,
    "@/lib/attendance": attendance,
    "next/cache": { revalidatePath: (path) => invalidations.push(path) },
    "next/headers": { headers: async () => new Headers() },
    "@/lib/auth": {
      auth: {
        api: {
          getSession: async (options) => {
            assert.equal(options.query.disableCookieCache, true);
            return sessionUser ? { user: { id: sessionUser } } : null;
          },
        },
      },
    },
  });
  async function seed(id, overrides = {}) {
    await db.insert(schema.attendanceRecords).values({
      id,
      userId: "one",
      attendanceDate: "2026-09-20",
      clockIn: "09:00",
      clockOut: "18:00",
      hasBreak: true,
      breakCount: 2,
      break1From: "12:00",
      break1To: "13:00",
      break2From: "15:00",
      break2To: "15:15",
      workMinutes: 465,
      hourlyWageYen: 1200,
      estimatedSalaryYen: 9300,
      payrollPeriodStart: "2026-08-21",
      payrollPeriodEnd: "2026-09-20",
      status: "deleted",
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-21T00:00:00Z"),
      ...overrides,
    });
  }
  async function record(id) {
    return (
      await db
        .select()
        .from(schema.attendanceRecords)
        .where(eq(schema.attendanceRecords.id, id))
    )[0];
  }
  return {
    client,
    db,
    actions,
    seed,
    record,
    invalidations,
    asUser: (value) => {
      sessionUser = value;
    },
  };
}

test("restore preserves schedule, breaks, original wage and creation date, but requires completing a draft before earnings count", async (t) => {
  const f = await fixture(t);
  await f.seed("deleted");
  const before = await f.record("deleted");
  assert.deepEqual(await f.actions.restoreAttendance("deleted"), {
    success: true,
  });
  const restored = await f.record("deleted");
  assert.deepEqual(restored, {
    ...before,
    status: "draft",
    workMinutes: 0,
    estimatedSalaryYen: 0,
    updatedAt: restored.updatedAt,
  });
  assert.ok(restored.updatedAt > before.updatedAt);
  assert.deepEqual(f.invalidations, ["/", "/history", "/salary-summary"]);
  assert.deepEqual(
    await f.actions.updateAttendance("deleted", {
      ...attendance.recordToInput(restored),
      status: "completed",
    }),
    { success: true },
  );
  const done = await f.record("deleted");
  assert.equal(done.hourlyWageYen, 1200);
  assert.equal(done.workMinutes, 465);
  assert.equal(done.estimatedSalaryYen, 9300);
});
test("restore accepts a deleted incomplete draft and blocks active/missing/repeated/invalid IDs without mutation", async (t) => {
  const f = await fixture(t);
  await f.seed("incomplete", {
    clockOut: null,
    workMinutes: 0,
    estimatedSalaryYen: 0,
  });
  assert.ok((await f.actions.restoreAttendance("incomplete")).success);
  const before = await f.record("incomplete");
  for (const id of ["incomplete", "missing", "", null, {}])
    assert.ok((await f.actions.restoreAttendance(id)).error);
  assert.deepEqual(await f.record("incomplete"), before);
});
test("restore enforces fresh authentication and ownership; another user's same date does not block restoration", async (t) => {
  const f = await fixture(t);
  await f.seed("own");
  await f.seed("foreign", { userId: "two", status: "completed" });
  assert.ok((await f.actions.restoreAttendance("foreign")).error);
  f.asUser(null);
  await assert.rejects(f.actions.restoreAttendance("own"), /Sesi berakhir/);
  f.asUser("one");
  assert.ok((await f.actions.restoreAttendance("own")).success);
  assert.equal((await f.record("foreign")).status, "completed");
});
for (const status of ["draft", "completed"])
  test(`restore rejects a date occupied by an existing ${status} and preserves both rows`, async (t) => {
    const f = await fixture(t);
    await f.seed("deleted");
    await f.seed("active", { status });
    const before = await f.record("deleted");
    assert.match(
      (await f.actions.restoreAttendance("deleted")).error,
      /catatan aktif/,
    );
    assert.deepEqual(await f.record("deleted"), before);
    assert.equal((await f.record("active")).status, status);
    assert.deepEqual(f.invalidations, []);
  });
test("restore rollback on database failure leaves deleted status and totals intact", async (t) => {
  const f = await fixture(t);
  await f.seed("deleted");
  const before = await f.record("deleted");
  await f.client.execute(
    "CREATE TRIGGER fail_restore BEFORE UPDATE ON attendance_records BEGIN SELECT RAISE(ABORT, 'test failure'); END",
  );
  await assert.rejects(f.actions.restoreAttendance("deleted"));
  assert.deepEqual(await f.record("deleted"), before);
  assert.deepEqual(f.invalidations, []);
});
test("concurrent restores never produce two active rows, and save/update respect the restored date", async (t) => {
  const f = await fixture(t);
  await f.seed("a");
  await f.seed("b");
  const outcomes = await Promise.allSettled([
    f.actions.restoreAttendance("a"),
    f.actions.restoreAttendance("b"),
  ]);
  assert.equal(
    outcomes.filter(
      (result) => result.status === "fulfilled" && result.value.success,
    ).length,
    1,
  );
  // Release the native SQLite connection's failed lock statement before the next request.
  await f.client.reconnect();
  const all = await f.db.select().from(schema.attendanceRecords);
  assert.equal(all.filter((r) => r.status !== "deleted").length, 1);
  const active = all.find((r) => r.status !== "deleted");
  await f.seed("different", {
    attendanceDate: "2026-09-21",
    status: "completed",
  });
  assert.match(
    (
      await f.actions.updateAttendance(
        "different",
        attendance.recordToInput(active),
      )
    ).error,
    /Sudah ada catatan/,
  );
  assert.ok(
    (
      await f.actions.saveAttendance({
        ...attendance.recordToInput(active),
        status: "completed",
      })
    ).success,
  );
  assert.equal((await f.db.select().from(schema.attendanceRecords)).length, 3);
  assert.equal((await f.record(active.id)).hourlyWageYen, 1200);
  assert.ok(
    (await f.actions.saveAttendance(attendance.recordToInput(active))).error,
  );
});
test("creating a new date and editing it still calculate totals and preserve its wage after the transaction refactor", async (t) => {
  const f = await fixture(t);
  const input = {
    ...attendance.blankAttendance("2026-10-01"),
    clockIn: "09:00",
    clockOut: "18:00",
    status: "completed",
  };
  assert.ok((await f.actions.saveAttendance(input)).success);
  const [created] = await f.db.select().from(schema.attendanceRecords);
  assert.equal(created.hourlyWageYen, 1500);
  assert.equal(created.estimatedSalaryYen, 13500);
  assert.ok(
    (
      await f.actions.updateAttendance(created.id, {
        ...input,
        clockOut: "17:00",
      })
    ).success,
  );
  assert.equal((await f.record(created.id)).estimatedSalaryYen, 12000);
  f.asUser("two");
  assert.ok((await f.actions.updateAttendance(created.id, input)).error);
});
