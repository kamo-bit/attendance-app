import { createClient } from "@libsql/client";
import { pathToFileURL } from "node:url";

// Run with explicit environment, e.g. node --env-file=.env.local scripts/migrate-user-preferences.mjs.
// This additive migration is safe to apply again; existing preferences are preserved.
export async function migrateUserPreferences(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      salary_email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (salary_email_enabled IN (0, 1)),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL must be set before running this migration.");
    process.exit(1);
  }
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  try {
    await migrateUserPreferences(client);
    console.log("User preferences migration complete.");
  } catch {
    console.error("User preferences migration failed. Check database access and schema.");
    process.exitCode = 1;
  } finally {
    client.close();
  }
}
