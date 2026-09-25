import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}) {
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  new Function("exports", "require", output)(exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  });
  return exports;
}
const attendance = load("../src/lib/attendance.ts");
const { AttendanceDraftStore, draftKey, draftTarget, draftBase, parseDraft, draftRecovery } =
  load("../src/lib/attendance-draft.ts", { "./attendance": attendance });

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
const initial = attendance.blankAttendance("2026-09-26");
const backup = (changes = {}) => ({
  version: 1, owner: "user-one", target: "date:2026-09-26", base: "new:2026-09-26",
  savedAt: Date.now(), value: { ...initial, clockIn: "09:", hasBreak: true, breakCount: 2, break1From: "12:00" },
  ...changes,
});

test("partial input and two incomplete breaks survive a fresh store instance without becoming completed", () => {
  const disk = storage();
  const first = new AttendanceDraftStore(() => disk);
  const draft = backup();
  draft.value.status = "completed";
  assert.equal(first.write(draft), true);
  const restored = new AttendanceDraftStore(() => disk).read(draft.owner, draft.target);
  assert.equal(restored.durable, true);
  assert.equal(restored.draft.value.clockIn, "09:");
  assert.equal(restored.draft.value.breakCount, 2);
  assert.equal(restored.draft.value.break1To, "");
  assert.equal(restored.draft.value.status, "draft");
  assert.ok(attendance.validateAttendance(restored.draft.value));
});

test("drafts are isolated by account and date/record, including identifier delimiters", () => {
  const disk = storage();
  const shared = new AttendanceDraftStore(() => disk);
  shared.write(backup());
  assert.equal(shared.read("user-two", "date:2026-09-26").draft, null);
  assert.equal(shared.read("user-one", "date:2026-09-27").draft, null);
  assert.equal(shared.read("user-one", "record:record-one").draft, null);
  assert.notEqual(draftKey("a:b", "c"), draftKey("a", "b:c"));
  assert.equal(shared.hasVolatileDrafts(), false);
});

test("storage quota/security failures retain input in memory and a successful retry makes it durable", () => {
  const disk = storage();
  let blocked = true;
  const store = new AttendanceDraftStore(() => {
    if (blocked) throw new Error("Storage blocked");
    return disk;
  });
  const draft = backup();
  assert.equal(store.write(draft), false);
  assert.equal(store.hasVolatileDrafts(), true);
  assert.equal(store.read(draft.owner, draft.target).draft.value.clockIn, "09:");
  assert.equal(store.read(draft.owner, draft.target).durable, false);
  blocked = false;
  assert.equal(store.write(draft), true);
  assert.equal(store.hasVolatileDrafts(), false);
  assert.equal(new AttendanceDraftStore(() => disk).read(draft.owner, draft.target).draft.value.clockIn, "09:");
});

test("corrupt, oversized, wrong-account and malformed backups are ignored safely", () => {
  for (const value of ["{", "x".repeat(17_000), "null", JSON.stringify(backup({ version: 2 })),
    JSON.stringify(backup({ owner: "other" })), JSON.stringify(backup({ value: { ...initial, clockIn: {} } })),
    JSON.stringify(backup({ value: { ...initial, breakCount: 9 } })), JSON.stringify(backup({ savedAt: "today" }))]) {
    assert.equal(parseDraft(value, "user-one", "date:2026-09-26"), null);
  }
});

test("recovery requires review after an account record changes, including changes within the same timestamp", () => {
  const record = { ...initial, id: "one", updatedAt: new Date("2026-09-26T00:00:00Z"), clockIn: "09:00", status: "draft" };
  const base = draftBase(initial.attendanceDate, record);
  const draft = backup({ base, target: draftTarget(initial.attendanceDate, record) });
  assert.equal(draftRecovery(draft, base, attendance.recordToInput(record)), "restore");
  const changedBase = draftBase(initial.attendanceDate, { ...record, clockIn: "10:00" });
  assert.equal(draftRecovery(draft, changedBase, attendance.recordToInput(record)), "review");
  assert.notEqual(draftBase(initial.attendanceDate, { ...record, status: "completed" }), base);
  assert.equal(draftRecovery(draft, changedBase, draft.value), "redundant");
});

test("explicit discard clears only the selected draft; failed deletion does not pretend to discard", () => {
  const disk = storage();
  const store = new AttendanceDraftStore(() => disk);
  store.write(backup());
  store.write(backup({ target: "date:2026-09-27" }));
  assert.equal(store.remove("user-one", "date:2026-09-26"), true);
  assert.equal(new AttendanceDraftStore(() => disk).read("user-one", "date:2026-09-26").draft, null);
  assert.ok(store.read("user-one", "date:2026-09-27").draft);
  disk.removeItem = () => { throw new Error("Blocked"); };
  assert.equal(store.remove("user-one", "date:2026-09-27"), false);
  assert.ok(store.read("user-one", "date:2026-09-27").draft);
});

test("successful account save clears the local backup and unload warning even if cleanup is blocked", () => {
  const disk = storage();
  const store = new AttendanceDraftStore(() => disk);
  const draft = backup();
  store.write(draft);
  store.committed(draft.owner, draft.target);
  assert.equal(store.read(draft.owner, draft.target).draft, null);
  const blocked = new AttendanceDraftStore(() => { throw new Error("Blocked"); });
  blocked.write(draft);
  assert.equal(blocked.hasVolatileDrafts(), true);
  blocked.committed(draft.owner, draft.target);
  assert.equal(blocked.hasVolatileDrafts(), false);
});
