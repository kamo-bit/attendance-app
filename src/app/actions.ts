"use server"

import { db } from "@/db"
import * as schema from "@/db/schema"
import { attendanceRecords, salarySettings, verifications, users, accounts } from "@/db/schema"
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
  return await db.select().from(schema.attendanceRecords)
    .where(eq(schema.attendanceRecords.userId, user.id))
    .orderBy(desc(schema.attendanceRecords.attendanceDate))
}

export async function deleteAttendance(id: string) {
  const user = await getSession()
  await db.delete(schema.attendanceRecords).where(
    and(
      eq(schema.attendanceRecords.id, id),
      eq(schema.attendanceRecords.userId, user.id)
    )
  )
  revalidatePath('/history')
}

export async function updateAttendance(id: string, data: any) {
  const user = await getSession()
  await db.update(schema.attendanceRecords)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(schema.attendanceRecords.id, id),
        eq(schema.attendanceRecords.userId, user.id)
      )
    )
  revalidatePath('/history')
}

export async function getTodayAttendance(date: string) {
  const user = await getSession()
  const records = await db.select().from(schema.attendanceRecords).where(
    and(
      eq(schema.attendanceRecords.userId, user.id),
      eq(schema.attendanceRecords.attendanceDate, date)
    )
  ).limit(1)
  
  return records.length > 0 ? records[0] : null
}

export async function getSalarySummary(periodStart: string, periodEnd: string) {
  const user = await getSession()
  const records = await db.select().from(schema.attendanceRecords).where(
    and(
      eq(schema.attendanceRecords.userId, user.id),
      eq(schema.attendanceRecords.payrollPeriodStart, periodStart),
      eq(schema.attendanceRecords.payrollPeriodEnd, periodEnd)
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

export async function getLatestResetLink(email: string) {
  try {
    // Note: This is purely for development/testing
    
    // Give Better Auth a moment to insert the token
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 1. Find user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });
    
    if (!user) return null;
    
    // 2. Find the latest verification token for this user
    const identifier = `reset-password:${user.id}`;
    
    const latestVerif = await db.query.verifications.findFirst({
      where: eq(schema.verifications.identifier, identifier),
      orderBy: [desc(schema.verifications.createdAt)]
    });
    
    if (latestVerif) {
      // 3. Extract the token (which IS the identifier part!)
      const token = latestVerif.identifier.split(":")[1];
      if (token) {
        // Construct the EXACT frontend URL with the token
        return { url: `/reset-password?token=${token}` };
      }
    }
    
    return null;
  } catch (e) {
    console.error(e)
    return null;
  }
}

export async function directResetPassword(email: string, newPassword: string) {
  try {
    const { hashPassword } = await import("better-auth/crypto");
    
    // 1. Find user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });
    
    if (!user) {
      return { error: "Email not found in our system" };
    }
    
    // 2. Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // 3. Find if they have a credential account
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(schema.accounts.userId, user.id),
        eq(schema.accounts.providerId, "credential")
      )
    });
    
    if (existingAccount) {
      // Update existing password
      await db.update(schema.accounts)
        .set({ password: hashedPassword as string, updatedAt: new Date() })
        .where(eq(schema.accounts.id, existingAccount.id));
    } else {
      // Create a new credential account for this user so they can login with password
      await db.insert(schema.accounts).values({
        id: crypto.randomUUID(),
        userId: user.id,
        accountId: user.email, // Better Auth uses email as accountId for credentials
        providerId: "credential",
        password: hashedPassword as string,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return { success: true };
  } catch (e: any) {
    console.error("Direct reset failed:", e);
    return { error: e.message || "Failed to reset password" };
  }
}
