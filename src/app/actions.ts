"use server"

import { db } from "@/db"
import { attendanceRecords, salarySettings, verifications } from "@/db/schema"
import { eq, and, gte, lte, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

// Helper to get current user session in Server Actions
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function getSalarySettings() {
  const user = await getSession()
  const settings = await db.select().from(salarySettings).where(eq(salarySettings.userId, user.id)).limit(1)
  
  if (settings.length > 0) {
    return settings[0]
  }
  
  // Create default if not exists
  const [newSetting] = await db.insert(salarySettings).values({
    userId: user.id,
    hourlyWageYen: 1115,
    effectiveFrom: new Date().toISOString().split('T')[0]
  }).returning()
  
  return newSetting
}

export async function updateSalarySettings(wage: number) {
  const user = await getSession()
  await db.update(salarySettings)
    .set({ hourlyWageYen: wage, updatedAt: new Date() })
    .where(eq(salarySettings.userId, user.id))
  
  revalidatePath('/')
}

export async function saveAttendance(data: any) {
  const user = await getSession()
  
  const existing = await db.select().from(attendanceRecords).where(
    and(
      eq(attendanceRecords.userId, user.id),
      eq(attendanceRecords.attendanceDate, data.attendanceDate)
    )
  ).limit(1)

  if (existing.length > 0) {
    await db.update(attendanceRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendanceRecords.id, existing[0].id))
  } else {
    await db.insert(attendanceRecords).values({
      ...data,
      userId: user.id,
    })
  }

  revalidatePath('/')
  revalidatePath('/history')
}

export async function getAttendanceHistory() {
  const user = await getSession()
  return await db.select().from(attendanceRecords)
    .where(eq(attendanceRecords.userId, user.id))
    .orderBy(desc(attendanceRecords.attendanceDate))
}

export async function deleteAttendance(id: string) {
  const user = await getSession()
  await db.delete(attendanceRecords).where(
    and(
      eq(attendanceRecords.id, id),
      eq(attendanceRecords.userId, user.id)
    )
  )
  revalidatePath('/history')
}

export async function updateAttendance(id: string, data: any) {
  const user = await getSession()
  await db.update(attendanceRecords)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(attendanceRecords.id, id),
        eq(attendanceRecords.userId, user.id)
      )
    )
  revalidatePath('/history')
}

export async function getTodayAttendance(date: string) {
  const user = await getSession()
  const records = await db.select().from(attendanceRecords).where(
    and(
      eq(attendanceRecords.userId, user.id),
      eq(attendanceRecords.attendanceDate, date)
    )
  ).limit(1)
  
  return records.length > 0 ? records[0] : null
}

export async function getSalarySummary(periodStart: string, periodEnd: string) {
  const user = await getSession()
  const records = await db.select().from(attendanceRecords).where(
    and(
      eq(attendanceRecords.userId, user.id),
      eq(attendanceRecords.payrollPeriodStart, periodStart),
      eq(attendanceRecords.payrollPeriodEnd, periodEnd)
    )
  )
  
  const totalMins = records.reduce((sum, r) => sum + r.workMinutes, 0)
  const totalSalary = records.reduce((sum, r) => sum + r.estimatedSalaryYen, 0)
  
  return {
    totalWorkMinutes: totalMins,
    totalWorkDays: records.filter(r => r.clockIn).length,
    totalSalaryYen: totalSalary,
    records
  }
}

export async function getYearlySummary(year: string) {
  const user = await getSession()
  const records = await db.select().from(attendanceRecords).where(
    and(
      eq(attendanceRecords.userId, user.id),
      gte(attendanceRecords.attendanceDate, `${year}-01-01`),
      lte(attendanceRecords.attendanceDate, `${year}-12-31`)
    )
  )
  
  const totalMins = records.reduce((sum, r) => sum + r.workMinutes, 0)
  const totalSalary = records.reduce((sum, r) => sum + r.estimatedSalaryYen, 0)
  
  return {
    totalWorkMinutes: totalMins,
    totalWorkDays: records.filter(r => r.clockIn).length,
    totalSalaryYen: totalSalary,
  }
}

export async function getLatestResetLink() {
  try {
    // Note: In a real app, returning reset tokens to the client is a security risk.
    // This is purely for development/testing as requested by the user.
    
    // Give Better Auth a moment to insert the token
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const latestVerif = await db.query.verifications.findFirst({
      orderBy: [desc(verifications.createdAt)]
    });
    
    if (latestVerif && latestVerif.value) {
      // The token itself is the value
      return { url: `/reset-password?token=${latestVerif.value}` };
    }
    return null;
  } catch (e) {
    console.error(e)
    return null;
  }
}
