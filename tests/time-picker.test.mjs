import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/time-picker.ts", import.meta.url),
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
const { clockValueAtPoint, normalizeTime, parseTime, formatTime } =
  compiled.exports;

test("wall clock follows clockwise hour positions and both 24-hour ranges", () => {
  assert.equal(clockValueAtPoint(0, -0.8, "hours", false), 0);
  assert.equal(clockValueAtPoint(0.8, 0, "hours", false), 3);
  assert.equal(clockValueAtPoint(0, 0.8, "hours", false), 6);
  assert.equal(clockValueAtPoint(-0.8, 0, "hours", false), 9);
  assert.equal(clockValueAtPoint(0, -0.8, "hours", true), 12);
  assert.equal(clockValueAtPoint(0.8, 0, "hours", true), 15);
  assert.equal(clockValueAtPoint(-0.4, -Math.sqrt(0.48), "hours", true), 23);
});

test("minute dial supports every minute and wraps correctly at midnight", () => {
  for (let minute = 0; minute < 60; minute++) {
    const angle = (minute * Math.PI) / 30;
    assert.equal(
      clockValueAtPoint(Math.sin(angle), -Math.cos(angle), "minutes", false),
      minute,
    );
  }
  assert.equal(clockValueAtPoint(-0.001, -1, "minutes", false), 0);
  assert.equal(formatTime(0, 0), "00:00");
  assert.equal(formatTime(23, 59), "23:59");
});

test("dragging through the center or a cancelled invalid point does not jump the hand", () => {
  assert.equal(clockValueAtPoint(0, 0, "hours", false), null);
  assert.equal(clockValueAtPoint(0.05, 0.05, "minutes", false), null);
  assert.equal(clockValueAtPoint(NaN, 1, "minutes", false), null);
});

test("typed time accepts common 24-hour inputs without accepting ambiguous or invalid times", () => {
  for (const value of ["930", "0930", "9:30", "09:30", "9.30"])
    assert.deepEqual(parseTime(value), { hours: 9, minutes: 30 });
  assert.equal(normalizeTime("0000"), "00:00");
  for (const value of [
    "",
    "9",
    "12:9",
    "2400",
    "23:60",
    "--:--",
    "11 PM",
    "12::30",
  ])
    assert.equal(parseTime(value), null);
});
