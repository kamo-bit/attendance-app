import { moveMonth, payrollPeriod, sumRecords, yen, type AttendanceRecord } from "./attendance";

// Rounded monthly averages from the March–August 2026 reference payslips.
// A rough estimate only: these are not statutory rates or actual payroll debts.
export const ESTIMATED_DEDUCTIONS = Object.freeze([
  Object.freeze({ key: "health", label: "Asuransi kesehatan", amount: 10_500 }),
  Object.freeze({ key: "pension", label: "Pensiun", amount: 18_300 }),
  Object.freeze({ key: "housing", label: "Asrama", amount: 22_000 }),
  Object.freeze({ key: "employment", label: "Asuransi ketenagakerjaan", amount: 1_100 }),
  Object.freeze({ key: "income-tax", label: "Pajak penghasilan", amount: 3_500 }),
]);
export const ESTIMATE_NOTE = "Estimasi potongan berdasarkan rata-rata slip Maret–Agustus 2026. Nominal gaji yang diterima dapat berbeda.";
export const LOW_INCOME_NOTE = "Potongan perkiraan lebih besar dari pendapatan tercatat. Periksa kelengkapan absensi; selisih ini bukan tagihan.";

export function jstDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function latestClosedPayrollMonth(today = jstDate()) {
  return Number(today.slice(8, 10)) > 20 ? today.slice(0, 7) : moveMonth(today, -1);
}

export function estimateYen(amount: number) {
  return amount < 0 ? `−${yen(Math.abs(amount))}` : yen(amount);
}

export function salaryEstimate(month: string, records: AttendanceRecord[], today = jstDate()) {
  const period = payrollPeriod(month);
  const included = records.filter((r) => r.attendanceDate >= period.start && r.attendanceDate <= period.end);
  const totals = sumRecords(included);
  const draftCount = included.filter((r) => r.status === "draft").length;
  const status = today <= period.end ? "open" : totals.days === 0 ? "empty" : "ready";
  const deductions = status === "ready" ? ESTIMATED_DEDUCTIONS : [];
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  return {
    month, period, status, draftCount, ...totals,
    availableFrom: `${month}-21`,
    deductions,
    totalDeductions,
    net: status === "ready" ? totals.salary - totalDeductions : null,
  };
}

export type SalaryEstimate = ReturnType<typeof salaryEstimate>;
