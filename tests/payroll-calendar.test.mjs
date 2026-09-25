import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}) {
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
  new Function("exports", "require", output)(compiled.exports, (name) => {
    if (!(name in dependencies))
      throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  });
  return compiled.exports;
}
const attendance = load("../src/lib/attendance.ts");
const {
  payrollViewForDate,
  changePayrollPeriod,
  isInPayrollPeriod,
  payrollRangeLabel,
  payrollCalendarMonths,
} = load("../src/lib/payroll-calendar.ts", { "./attendance": attendance });

test("date links select the correct payroll period while keeping the actual calendar month, including the year boundary", () => {
  for (const [date, month] of [
    ["2026-09-20", "2026-09"],
    ["2026-09-21", "2026-10"],
    ["2026-12-31", "2027-01"],
    ["2027-01-20", "2027-01"],
    ["2027-01-21", "2027-02"],
  ]) {
    assert.deepEqual(payrollViewForDate(date), {
      month,
      calendarMonth: date.slice(0, 7),
      selectedDate: date,
    });
    assert.equal(isInPayrollPeriod(date, month), true);
  }
});

test("payroll range labels include the year and explicitly distinguish a range across two years", () => {
  assert.equal(payrollRangeLabel("2026-10"), "21 Sep – 20 Okt 2026");
  assert.equal(payrollRangeLabel("2027-01"), "21 Des 2026 – 20 Jan 2027");
});

test("calendar shortcuts cover every payroll day exactly once, including February and leap years", () => {
  for (const [month, previousLastDay] of [
    ["2026-10", "2026-09-30"],
    ["2027-01", "2026-12-31"],
    ["2027-03", "2027-02-28"],
    ["2028-03", "2028-02-29"],
  ]) {
    const [previous, current] = payrollCalendarMonths(month);
    assert.equal(previous.start, attendance.payrollPeriod(month).start);
    assert.equal(previous.end, previousLastDay);
    assert.equal(current.start, `${month}-01`);
    assert.equal(current.end, attendance.payrollPeriod(month).end);
    const next = attendance.parseDate(previous.end);
    next.setDate(next.getDate() + 1);
    assert.equal(attendance.localDate(next), current.start);
  }
});

test("changing payroll period keeps a selected day in range, otherwise chooses today or the closing date", () => {
  const current = payrollViewForDate("2026-09-25");
  assert.deepEqual(
    changePayrollPeriod(current, "2026-10", "2026-09-26"),
    current,
  );
  assert.deepEqual(changePayrollPeriod(current, "2026-09", "2026-09-26"), {
    month: "2026-09",
    calendarMonth: "2026-09",
    selectedDate: "2026-09-20",
  });
  const older = payrollViewForDate("2026-08-15");
  assert.deepEqual(changePayrollPeriod(older, "2026-10", "2026-09-26"), {
    month: "2026-10",
    calendarMonth: "2026-09",
    selectedDate: "2026-09-26",
  });
  assert.deepEqual(changePayrollPeriod(current, "2027-01", "2026-09-26"), {
    month: "2027-01",
    calendarMonth: "2027-01",
    selectedDate: "2027-01-20",
  });
  assert.equal(current.selectedDate, "2026-09-25");
});

test("empty or malformed period input never corrupts the selected view", () => {
  const current = payrollViewForDate("2026-09-25");
  for (const invalid of [
    "",
    "2026-00",
    "2026-13",
    "2026-9",
    "nonsense",
    "2026-09-01",
  ]) {
    assert.equal(changePayrollPeriod(current, invalid, "2026-09-26"), current);
  }
});

test("the displayed range and earnings include both cutoff days and exclude drafts/deleted records", () => {
  const records = [
    ["2026-09-20", "completed", 1000],
    ["2026-09-21", "completed", 2000],
    ["2026-10-20", "completed", 3000],
    ["2026-10-21", "completed", 4000],
    ["2026-09-25", "draft", 5000],
    ["2026-09-26", "deleted", 6000],
  ].map(([attendanceDate, status, estimatedSalaryYen]) => ({
    attendanceDate,
    status,
    estimatedSalaryYen,
    workMinutes: 60,
  }));
  const filtered = records.filter((r) =>
    isInPayrollPeriod(r.attendanceDate, "2026-10"),
  );
  assert.deepEqual(attendance.sumRecords(filtered), {
    salary: 5000,
    minutes: 120,
    days: 2,
  });
});
