import type { attendanceRecords } from "@/db/schema";

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type AttendanceInput = {
  attendanceDate: string;
  clockIn: string;
  clockOut: string;
  hasBreak: boolean;
  breakCount: 0 | 1 | 2;
  break1From: string;
  break1To: string;
  break2From: string;
  break2To: string;
  status: "draft" | "completed";
};
export const blankAttendance = (date: string): AttendanceInput => ({
  attendanceDate: date,
  clockIn: "",
  clockOut: "",
  hasBreak: false,
  breakCount: 0,
  break1From: "",
  break1To: "",
  break2From: "",
  break2To: "",
  status: "draft",
});
export function recordToInput(record: AttendanceRecord): AttendanceInput {
  return {
    attendanceDate: record.attendanceDate,
    clockIn: record.clockIn || "",
    clockOut: record.clockOut || "",
    hasBreak: record.hasBreak,
    breakCount: record.breakCount === 2 ? 2 : record.hasBreak ? 1 : 0,
    break1From: record.break1From || "",
    break1To: record.break1To || "",
    break2From: record.break2From || "",
    break2To: record.break2To || "",
    status: record.status === "completed" ? "completed" : "draft",
  };
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parseDate(value).getTime()) &&
    localDate(parseDate(value)) === value
  );
}
export const yen = (amount: number) =>
  `¥${Math.floor(amount).toLocaleString("id-ID")}`;
export const duration = (minutes: number) =>
  `${Math.floor(minutes / 60).toLocaleString("id-ID")} jam${minutes % 60 ? ` ${minutes % 60} menit` : ""}`;
export const dateLabel = (value: string, full = false) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: full ? "long" : "short",
    day: "numeric",
    month: full ? "long" : "short",
    year: "numeric",
  }).format(parseDate(value));
export const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    parseDate(`${value.slice(0, 7)}-01`),
  );
export function moveMonth(value: string, offset: number) {
  const date = parseDate(`${value.slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + offset);
  return localDate(date).slice(0, 7);
}
export function payrollPeriod(month: string) {
  return {
    start: `${moveMonth(month, -1)}-21`,
    end: `${month.slice(0, 7)}-20`,
  };
}
export function payrollMonth(date: string) {
  return Number(date.slice(8, 10)) >= 21
    ? moveMonth(date.slice(0, 7), 1)
    : date.slice(0, 7);
}
export function minutesBetween(start: string, end: string) {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
  )
    return 0;
  const mins = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return Math.max(0, mins(end) - mins(start));
}
export function calculateAttendance(data: AttendanceInput) {
  const gross = minutesBetween(data.clockIn, data.clockOut);
  const rest = data.hasBreak
    ? minutesBetween(data.break1From, data.break1To) +
      (data.breakCount === 2
        ? minutesBetween(data.break2From, data.break2To)
        : 0)
    : 0;
  return { gross, rest, net: data.clockOut ? Math.max(0, gross - rest) : 0 };
}
export function validateAttendance(data: AttendanceInput) {
  if (!validDate(data.attendanceDate)) return "Pilih tanggal kerja yang valid.";
  if (!data.clockIn) return "Isi jam masuk terlebih dahulu.";
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    !timePattern.test(data.clockIn) ||
    (data.clockOut && !timePattern.test(data.clockOut))
  )
    return "Gunakan jam yang valid dalam format 24 jam.";
  if (data.status === "completed" && !data.clockOut)
    return "Isi jam pulang, atau simpan sebagai draf.";
  if (data.clockOut && data.clockOut <= data.clockIn)
    return "Jam pulang harus setelah jam masuk pada tanggal yang sama.";
  if (data.hasBreak) {
    if (data.breakCount !== 1 && data.breakCount !== 2)
      return "Pilih satu atau dua waktu istirahat.";
    const breaks = [
      [data.break1From, data.break1To],
      ...(data.breakCount === 2 ? [[data.break2From, data.break2To]] : []),
    ];
    for (let i = 0; i < breaks.length; i++) {
      const [start, end] = breaks[i];
      if (!timePattern.test(start) || !timePattern.test(end))
        return `Lengkapi waktu mulai dan selesai istirahat ${i + 1}.`;
      if (end <= start)
        return `Selesai istirahat ${i + 1} harus setelah waktu mulai.`;
      if (start < data.clockIn || (data.clockOut && end > data.clockOut))
        return `Istirahat ${i + 1} harus berada di dalam jam kerja.`;
    }
    if (data.breakCount === 2 && data.break2From < data.break1To)
      return "Istirahat kedua harus dimulai setelah istirahat pertama selesai.";
  }
  return null;
}
export function sumRecords(records: AttendanceRecord[]) {
  const completed = records.filter((r) => r.status === "completed");
  return {
    salary: completed.reduce((sum, r) => sum + r.estimatedSalaryYen, 0),
    minutes: completed.reduce((sum, r) => sum + r.workMinutes, 0),
    days: new Set(completed.map((r) => r.attendanceDate)).size,
  };
}
export function activity(record: AttendanceRecord) {
  if (record.status === "deleted")
    return { label: "Dihapus", className: "deleted" };
  if (
    new Date(record.updatedAt).getTime() > new Date(record.createdAt).getTime()
  )
    return { label: "Diubah", className: "edited" };
  return { label: "Dibuat", className: "created" };
}
export function calendarDays(month: string) {
  const first = parseDate(`${month.slice(0, 7)}-01`);
  const offset = (first.getDay() + 6) % 7;
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12);
  return Array.from(
    { length: Math.ceil((offset + last.getDate()) / 7) * 7 },
    (_, i) =>
      localDate(
        new Date(first.getFullYear(), first.getMonth(), 1 - offset + i, 12),
      ),
  );
}
