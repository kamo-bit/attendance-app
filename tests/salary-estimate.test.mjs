import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { render, toPlainText } from "@react-email/render";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function("exports", "require", "module", output)(compiled.exports,
    name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), compiled);
  return compiled.exports;
}
const attendance = load("../src/lib/attendance.ts");
const helpers = load("../src/lib/salary-estimate.ts", { "./attendance": attendance });
const { salaryEstimate, jstDate, latestClosedPayrollMonth, estimateYen } = helpers;
const Email = load("../src/components/emails/salary-summary-email.tsx", { "../../lib/salary-estimate": helpers }).default;
const Panel = load("../src/components/salary-deductions.tsx", { "@/lib/salary-estimate": helpers, "@/lib/attendance": attendance }).SalaryDeductions;
const row = (date, salary = 200000, status = "completed") => ({ attendanceDate: date, estimatedSalaryYen: salary, workMinutes: 480, status });
const closed = (records = [row("2026-09-15")]) => salaryEstimate("2026-09", records, "2026-09-21");

test("deductions become available at the end of the 20th in Japan, independently of the server timezone", () => {
  const before = new Date("2026-09-20T14:59:59.999Z");
  const after = new Date("2026-09-20T15:00:00.000Z");
  assert.equal(jstDate(before), "2026-09-20");
  assert.equal(jstDate(after), "2026-09-21");
  const records = [row("2026-09-20")];
  const pending = salaryEstimate("2026-09", records, jstDate(before));
  assert.equal(pending.status, "open");
  assert.equal(pending.net, null);
  assert.equal(pending.totalDeductions, 0);
  assert.deepEqual(pending.deductions, []);
  assert.equal(salaryEstimate("2026-09", records, jstDate(after)).net, 144600);
});

test("closed-period shortcut handles cutoff, leap month and year rollover", () => {
  for (const [date, expected] of [["2026-09-20", "2026-08"], ["2026-09-21", "2026-09"], ["2027-01-01", "2026-12"], ["2027-01-20", "2026-12"], ["2027-01-21", "2027-01"], ["2028-02-29", "2028-02"]])
    assert.equal(latestClosedPayrollMonth(date), expected);
  assert.deepEqual(salaryEstimate("2027-01", [], "2027-01-21").period, { start: "2026-12-21", end: "2027-01-20" });
});

test("charges exactly five agreed rounded deductions once per populated closed period", () => {
  const result = closed([row("2026-08-21", 100000), row("2026-09-20", 100000)]);
  assert.equal(result.salary, 200000);
  assert.equal(result.net, 144600);
  assert.equal(result.totalDeductions, 55400);
  assert.deepEqual(result.deductions.map(d => d.amount), [10500, 18300, 22000, 1100, 3500]);
  assert.equal(closed([row("2026-09-01", 200000)]).totalDeductions, result.totalDeductions);
});

test("excludes neighboring payroll periods, deleted rows, and draft values while counting drafts", () => {
  const result = closed([row("2026-08-20", 999999), row("2026-08-21", 100000), row("2026-09-20", 100000), row("2026-09-21", 999999), row("2026-09-10", 999999, "draft"), row("2026-09-11", 999999, "deleted")]);
  assert.equal(result.salary, 200000);
  assert.equal(result.minutes, 960);
  assert.equal(result.days, 2);
  assert.equal(result.draftCount, 1);
  assert.equal(result.net, 144600);
});

test("empty and draft-only closed periods do not accrue imaginary deductions or debt", () => {
  for (const records of [[], [row("2026-09-10", 999999, "draft")], [row("2026-09-10", 999999, "deleted")]]) {
    const result = closed(records);
    assert.equal(result.status, "empty");
    assert.equal(result.totalDeductions, 0);
    assert.equal(result.net, null);
    const html = renderToStaticMarkup(Panel({ estimate: result }));
    assert.match(html, /Belum cukup data/);
    assert.doesNotMatch(html, /¥55\.400/);
  }
});

test("future periods keep their estimate hidden even if completed records already exist", () => {
  const result = salaryEstimate("2027-01", [row("2027-01-03")], "2026-09-21");
  assert.equal(result.status, "open");
  assert.equal(result.net, null);
});

test("recalculating after editing or deleting attendance uses stored gross wages without mutating records", () => {
  const records = [row("2026-09-15", 100000), row("2026-09-16", 120000)];
  const copy = structuredClone(records);
  assert.equal(closed(records).net, 164600);
  assert.deepEqual(records, copy);
  records[1].estimatedSalaryYen = 130000;
  assert.equal(closed(records).net, 174600);
  records[1].status = "deleted";
  assert.equal(closed(records).net, 44600);
});

test("low gross produces an explicit signed estimate difference, never a debt claim", async () => {
  const estimate = closed([row("2026-09-15", 10000)]);
  assert.equal(estimate.net, -45400);
  assert.equal(estimateYen(estimate.net), "−¥45.400");
  const html = renderToStaticMarkup(Panel({ estimate }));
  assert.match(html, /Selisih estimasi/);
  assert.match(html, /bukan tagihan/);
  const text = toPlainText(await render(Email({ userName: "Uji", period: "21 Agu – 20 Sep 2026", totalWorkHours: "8 jam", totalWorkDays: 1, totalSalary: "¥10.000", estimate })));
  assert.match(text, /Selisih estimasi/i);
  assert.match(text, /bukan tagihan/);
  assert.match(text, /−¥45\.400/);
});

test("web panel and HTML/plain-text email show identical complete gross, deduction and net breakdowns", async () => {
  const estimate = closed([row("2026-09-15"), row("2026-09-16", 999999, "draft")]);
  const panel = renderToStaticMarkup(Panel({ estimate }));
  const html = await render(Email({ userName: "<script>test</script>", period: "21 Agu – 20 Sep 2026", totalWorkHours: "8 jam", totalWorkDays: 1, totalSalary: "¥200.000", estimate, summaryUrl: "https://www.absenkuy.cc/salary-summary?period=2026-09" }));
  const text = toPlainText(html);
  for (const value of ["¥200.000", "¥10.500", "¥18.300", "¥22.000", "¥1.100", "¥3.500", "¥55.400", "¥144.600", "1 absensi draf", "Maret–Agustus 2026"]) {
    assert.ok(panel.includes(value), `Missing from panel: ${value}`);
    assert.ok(text.includes(value), `Missing from email: ${value}`);
  }
  for (const item of estimate.deductions) assert.ok(text.includes(item.label));
  assert.ok(!html.includes("<script>"));
  assert.ok(text.includes("https://www.absenkuy.cc/salary-summary?period=2026-09"));
  assert.ok(Buffer.byteLength(html) < 100000);
});
