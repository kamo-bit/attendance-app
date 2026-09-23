"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { accounts, salarySettings, userPreferences, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { salaryEmailPreferenceError, type UserSettings } from "@/lib/user-settings";

async function authenticatedUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session?.user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  return session.user.id;
}

export async function getUserSettings(): Promise<UserSettings> {
  const userId = await authenticatedUserId();
  const [[user], linkedAccounts, [salary], [preferences]] = await Promise.all([
    db.select({ name: users.name, email: users.email, emailVerified: users.emailVerified, image: users.image })
      .from(users).where(eq(users.id, userId)).limit(1),
    db.select({
      providerId: accounts.providerId,
      hasPassword: sql<number>`case when ${accounts.password} is not null and ${accounts.password} <> '' then 1 else 0 end`,
    }).from(accounts).where(eq(accounts.userId, userId)),
    db.select({ wage: salarySettings.hourlyWageYen }).from(salarySettings)
      .where(eq(salarySettings.userId, userId)).limit(1),
    db.select({ enabled: userPreferences.salaryEmailEnabled }).from(userPreferences)
      .where(eq(userPreferences.userId, userId)).limit(1),
  ]);
  if (!user) throw new Error("Akun tidak ditemukan. Silakan masuk kembali.");
  return {
    ...user,
    providers: [...new Set(linkedAccounts.map((account) => account.providerId))],
    hasPassword: linkedAccounts.some((account) => account.providerId === "credential" && Boolean(account.hasPassword)),
    wage: salary?.wage ?? 1115,
    salaryEmailEnabled: preferences?.enabled ?? true,
  };
}

export async function saveEmailPreference(enabled: boolean): Promise<{ success: true } | { error: string }> {
  const error = salaryEmailPreferenceError(enabled);
  if (error) return { error };
  try {
    const userId = await authenticatedUserId();
    await db.insert(userPreferences).values({ userId, salaryEmailEnabled: enabled, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { salaryEmailEnabled: enabled, updatedAt: new Date() },
      });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { error: "Pengaturan email belum tersimpan. Pastikan sesi masih aktif, lalu coba lagi." };
  }
}
