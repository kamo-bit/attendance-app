"use server";

import { db } from "@/db";
import { attendanceRecords, salarySettings, holidays } from "@/db/schema";
import { eq, and, desc, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  type AttendanceInput,
  calculateAttendance,
  validateAttendance,
  payrollMonth,
  payrollPeriod,
  localDate,
  validDate,
} from "@/lib/attendance";

async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session?.user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  return session.user;
}
function refreshPages() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/salary-summary");
}
async function settingsFor(userId: string) {
  const [settings] = await db
    .select()
    .from(salarySettings)
    .where(eq(salarySettings.userId, userId))
    .limit(1);
  return settings || null;
}
export async function getWorkspaceData() {
  const user = await getUser();
  const [records, settings, days] = await Promise.all([
    db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.userId, user.id))
      .orderBy(desc(attendanceRecords.updatedAt)),
    settingsFor(user.id),
    db.select().from(holidays).where(eq(holidays.userId, user.id)),
  ]);
  return {
    records,
    wage: settings?.hourlyWageYen ?? 1115,
    holidays: days.map((day) => day.date),
  };
}
export async function updateSalarySettings(wage: number) {
  const user = await getUser();
  if (!Number.isSafeInteger(wage) || wage < 1 || wage > 1_000_000)
    return {
      error: "Isi upah per jam antara ¥1 dan ¥1.000.000 tanpa desimal.",
    };
  const existing = await settingsFor(user.id);
  if (existing)
    await db
      .update(salarySettings)
      .set({ hourlyWageYen: wage, updatedAt: new Date() })
      .where(eq(salarySettings.userId, user.id));
  else
    await db.insert(salarySettings).values({
      userId: user.id,
      hourlyWageYen: wage,
      effectiveFrom: localDate(),
    });
  refreshPages();
  return { success: true };
}
function recordValues(data: AttendanceInput, wage: number) {
  const { net } = calculateAttendance(data);
  const period = payrollPeriod(payrollMonth(data.attendanceDate));
  // Only accept editable fields. Totals and the recorded rate are determined on the server.
  return {
    attendanceDate: data.attendanceDate,
    clockIn: data.clockIn,
    clockOut: data.clockOut || null,
    hasBreak: data.hasBreak,
    breakCount: data.hasBreak ? data.breakCount : 0,
    break1From: data.hasBreak ? data.break1From : null,
    break1To: data.hasBreak ? data.break1To : null,
    break2From: data.hasBreak && data.breakCount === 2 ? data.break2From : null,
    break2To: data.hasBreak && data.breakCount === 2 ? data.break2To : null,
    workMinutes: data.status === "completed" ? net : 0,
    estimatedSalaryYen:
      data.status === "completed" ? Math.floor((net * wage) / 60) : 0,
    hourlyWageYen: wage,
    payrollPeriodStart: period.start,
    payrollPeriodEnd: period.end,
    status: data.status,
  };
}
function inputError(data: AttendanceInput) {
  if (
    !data ||
    typeof data.attendanceDate !== "string" ||
    typeof data.clockIn !== "string" ||
    typeof data.clockOut !== "string" ||
    typeof data.hasBreak !== "boolean" ||
    !["draft", "completed"].includes(data.status)
  )
    return "Data absensi tidak valid.";
  return validateAttendance(data);
}
export async function saveAttendance(data: AttendanceInput) {
  const user = await getUser();
  const error = inputError(data);
  if (error) return { error };
  const settings = await settingsFor(user.id);
  // libSQL starts a write transaction before checking the date, serializing writers.
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, user.id),
          eq(attendanceRecords.attendanceDate, data.attendanceDate),
          ne(attendanceRecords.status, "deleted"),
        ),
      )
      .limit(1);
    if (existing?.status === "completed")
      return {
        error:
          "Absensi tanggal ini sudah selesai. Gunakan Ubah catatan untuk memperbaruinya.",
      };
    const values = recordValues(
      data,
      existing?.hourlyWageYen ?? settings?.hourlyWageYen ?? 1115,
    );
    if (existing)
      await tx
        .update(attendanceRecords)
        .set({ ...values, updatedAt: new Date() })
        .where(
          and(
            eq(attendanceRecords.id, existing.id),
            eq(attendanceRecords.userId, user.id),
          ),
        );
    else
      await tx.insert(attendanceRecords).values({ ...values, userId: user.id });
    return { success: true };
  });
  if (result.error) return result;
  refreshPages();
  return result;
}
export async function updateAttendance(id: string, data: AttendanceInput) {
  const user = await getUser();
  const error = inputError(data);
  if (error) return { error };
  // libSQL starts a write transaction before checking the date, serializing writers.
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.id, id),
          eq(attendanceRecords.userId, user.id),
          ne(attendanceRecords.status, "deleted"),
        ),
      )
      .limit(1);
    if (!existing)
      return { error: "Catatan tidak ditemukan atau sudah dihapus." };
    const [duplicate] = await tx
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, user.id),
          eq(attendanceRecords.attendanceDate, data.attendanceDate),
          ne(attendanceRecords.id, id),
          ne(attendanceRecords.status, "deleted"),
        ),
      )
      .limit(1);
    if (duplicate)
      return {
        error: "Sudah ada catatan pada tanggal tersebut. Pilih tanggal lain.",
      };
    await tx
      .update(attendanceRecords)
      .set({
        ...recordValues(data, existing.hourlyWageYen),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceRecords.id, id),
          eq(attendanceRecords.userId, user.id),
        ),
      );
    return { success: true };
  });
  if (result.error) return result;
  refreshPages();
  return result;
}
export async function restoreAttendance(id: string) {
  const user = await getUser();
  if (typeof id !== "string" || !id) return { error: "Catatan tidak valid." };
  const result = await db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.id, id),
          eq(attendanceRecords.userId, user.id),
          eq(attendanceRecords.status, "deleted"),
        ),
      )
      .limit(1);
    if (!record)
      return { error: "Catatan tidak ditemukan atau sudah dipulihkan." };
    const [duplicate] = await tx
      .select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, user.id),
          eq(attendanceRecords.attendanceDate, record.attendanceDate),
          ne(attendanceRecords.status, "deleted"),
        ),
      )
      .limit(1);
    if (duplicate)
      return {
        error:
          "Tanggal ini sudah memiliki catatan aktif. Periksa catatan tersebut sebelum memulihkan catatan yang dihapus.",
      };
    // Deletion did not retain the previous status. Require review before adding earnings again.
    await tx
      .update(attendanceRecords)
      .set({
        status: "draft",
        workMinutes: 0,
        estimatedSalaryYen: 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceRecords.id, id),
          eq(attendanceRecords.userId, user.id),
        ),
      );
    return { success: true };
  });
  if (result.error) return result;
  refreshPages();
  return result;
}
export async function deleteAttendance(id: string) {
  const user = await getUser();
  await db
    .update(attendanceRecords)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(
      and(eq(attendanceRecords.id, id), eq(attendanceRecords.userId, user.id)),
    );
  refreshPages();
  return { success: true };
}
export async function saveUserHolidays(dates: string[]) {
  const user = await getUser();
  if (
    !Array.isArray(dates) ||
    dates.length > 10_000 ||
    dates.some((date) => typeof date !== "string" || !validDate(date))
  )
    return { error: "Daftar tanggal hari libur tidak valid." };
  await db.transaction(async (tx) => {
    await tx.delete(holidays).where(eq(holidays.userId, user.id));
    const unique = [...new Set(dates)];
    if (unique.length)
      await tx
        .insert(holidays)
        .values(unique.map((date) => ({ userId: user.id, date })));
  });
  refreshPages();
  return { success: true };
}
