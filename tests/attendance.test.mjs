import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Run the pure domain helpers without loading Next.js or a database.
const source = readFileSync(
  new URL("../src/lib/attendance.ts", import.meta.url),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const compiled = { exports: {} };
new Function("exports", output)(compiled.exports);
const {
  blankAttendance,
  validateAttendance,
  calculateAttendance,
  payrollPeriod,
  payrollMonth,
  calendarDays,
  sumRecords,
  yen,
  validDate,
  attendanceFormDefaults,
} = compiled.exports;
const complete = {
  ...blankAttendance("2026-09-18"),
  clockIn: "09:00",
  clockOut: "18:00",
  hasBreak: true,
  breakCount: 1,
  break1From: "12:00",
  break1To: "13:00",
  status: "completed",
};

test("9-hour day less a 1-hour break produces 8 paid hours", () => {
  assert.equal(validateAttendance(complete), null);
  assert.deepEqual(calculateAttendance(complete), {
    gross: 540,
    rest: 60,
    net: 480,
  });
  assert.equal(yen((480 * 1200) / 60), "¥9.600");
});
test("a second break is deducted, disabled breaks are ignored", () => {
  assert.equal(
    calculateAttendance({
      ...complete,
      breakCount: 2,
      break2From: "15:00",
      break2To: "15:15",
    }).net,
    465,
  );
  assert.equal(calculateAttendance({ ...complete, hasBreak: false }).net, 540);
});
test("overlap and breaks outside working hours are rejected", () => {
  assert.match(
    validateAttendance({
      ...complete,
      breakCount: 2,
      break2From: "12:30",
      break2To: "13:30",
    }),
    /kedua/,
  );
  assert.match(
    validateAttendance({ ...complete, break1From: "08:00" }),
    /di dalam/,
  );
  assert.match(validateAttendance({ ...complete, break1To: "" }), /Lengkapi/);
});
test("draft permits missing clock out but still requires valid clock in", () => {
  assert.equal(
    validateAttendance({ ...complete, clockOut: "", status: "draft" }),
    null,
  );
  assert.match(validateAttendance({ ...complete, clockOut: "" }), /jam pulang/);
  assert.match(
    validateAttendance({ ...complete, clockIn: "", status: "draft" }),
    /jam masuk/,
  );
  assert.match(
    validateAttendance({ ...complete, clockIn: "25:00" }),
    /format 24 jam/,
  );
});
test("reversed or identical working times are rejected", () => {
  assert.match(
    validateAttendance({ ...complete, clockOut: "08:00" }),
    /setelah/,
  );
  assert.match(
    validateAttendance({ ...complete, clockOut: "09:00" }),
    /setelah/,
  );
});
test("payroll cutoff and year boundary use the 21st–20th cycle", () => {
  assert.deepEqual(payrollPeriod("2026-01"), {
    start: "2025-12-21",
    end: "2026-01-20",
  });
  assert.equal(payrollMonth("2026-09-20"), "2026-09");
  assert.equal(payrollMonth("2026-09-21"), "2026-10");
  assert.equal(payrollMonth("2026-12-31"), "2027-01");
});
test("September 2026 calendar starts on Monday and includes all 30 days", () => {
  const dates = calendarDays("2026-09");
  assert.equal(dates[0], "2026-08-31");
  assert.equal(dates[1], "2026-09-01");
  assert.equal(dates.filter((day) => day.startsWith("2026-09")).length, 30);
  assert.equal(dates.length % 7, 0);
});
test("invalid calendar dates are rejected, leap days accepted", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate(""), false);
});

test("partial time input does not produce NaN in the live summary", () => {
  assert.deepEqual(
    calculateAttendance({ ...complete, clockIn: "0", clockOut: "18:" }),
    { gross: 0, rest: 60, net: 0 },
  );
});
test("summary excludes drafts and deleted records and uses stored earnings", () => {
  const rows = [
    {
      attendanceDate: "2026-09-18",
      status: "completed",
      workMinutes: 480,
      estimatedSalaryYen: 9600,
    },
    {
      attendanceDate: "2026-09-17",
      status: "completed",
      workMinutes: 60,
      estimatedSalaryYen: 1115,
    },
    {
      attendanceDate: "2026-09-16",
      status: "draft",
      workMinutes: 99,
      estimatedSalaryYen: 900,
    },
    {
      attendanceDate: "2026-09-15",
      status: "deleted",
      workMinutes: 480,
      estimatedSalaryYen: 9600,
    },
  ];
  assert.deepEqual(sumRecords(rows), { salary: 10715, minutes: 540, days: 2 });
});

test("new date copies the nearest earlier completed schedule, including both breaks", () => {
  const records = [
    { ...complete, attendanceDate: "2026-09-16", updatedAt: "2026-09-22" },
    {
      ...complete,
      attendanceDate: "2026-09-19",
      status: "draft",
      clockOut: "",
    },
    { ...complete, attendanceDate: "2026-09-19", status: "deleted" },
    { ...complete, attendanceDate: "2026-09-21", clockIn: "10:00" },
    {
      ...complete,
      attendanceDate: "2026-09-18",
      breakCount: 2,
      break2From: "15:00",
      break2To: "15:15",
      hourlyWageYen: 1200,
      id: "source",
    },
  ];
  const order = records.map((record) => record.attendanceDate);
  const result = attendanceFormDefaults("2026-09-20", records);
  assert.equal(result.sourceDate, "2026-09-18");
  assert.deepEqual(result.value, {
    ...complete,
    attendanceDate: "2026-09-20",
    status: "draft",
    breakCount: 2,
    break2From: "15:00",
    break2To: "15:15",
  });
  assert.deepEqual(
    records.map((record) => record.attendanceDate),
    order,
  );
  assert.equal(records[4].attendanceDate, "2026-09-18");
});

test("saved draft and completed record take priority over defaults", () => {
  for (const status of ["draft", "completed"]) {
    const current = {
      ...complete,
      attendanceDate: "2026-09-19",
      status,
      clockIn: "10:30",
      clockOut: status === "draft" ? "" : "18:30",
    };
    const result = attendanceFormDefaults("2026-09-19", [complete, current]);
    assert.equal(result.sourceDate, null);
    assert.equal(result.value.clockIn, "10:30");
    assert.equal(result.value.clockOut, current.clockOut);
    assert.equal(result.value.status, status);
  }
});

test("no earlier completed record leaves the form blank", () => {
  const result = attendanceFormDefaults("2026-09-17", [complete]);
  assert.deepEqual(result, {
    value: blankAttendance("2026-09-17"),
    sourceDate: null,
  });
  assert.deepEqual(attendanceFormDefaults("2026-09-19", []), {
    value: blankAttendance("2026-09-19"),
    sourceDate: null,
  });
});

test("disabled and unused break values are not carried into a new date", () => {
  const noBreak = attendanceFormDefaults("2026-09-19", [
    {
      ...complete,
      hasBreak: false,
      breakCount: 2,
      break2From: "15:00",
      break2To: "15:15",
    },
  ]).value;
  assert.equal(noBreak.hasBreak, false);
  assert.equal(noBreak.breakCount, 0);
  for (const field of ["break1From", "break1To", "break2From", "break2To"])
    assert.equal(noBreak[field], "");
  const oneBreak = attendanceFormDefaults("2026-09-19", [
    { ...complete, break2From: "15:00", break2To: "15:15" },
  ]).value;
  assert.equal(oneBreak.breakCount, 1);
  assert.equal(oneBreak.break1From, "12:00");
  assert.equal(oneBreak.break2From, "");
  assert.equal(oneBreak.break2To, "");
});

test("defaults work across a month/year boundary and ignore a deleted target record", () => {
  const result = attendanceFormDefaults("2027-01-02", [
    { ...complete, attendanceDate: "2026-12-31" },
    {
      ...complete,
      attendanceDate: "2027-01-02",
      status: "deleted",
      clockIn: "11:00",
    },
  ]);
  assert.equal(result.sourceDate, "2026-12-31");
  assert.equal(result.value.attendanceDate, "2027-01-02");
  assert.equal(result.value.clockIn, "09:00");
  assert.equal(result.value.status, "draft");
});
