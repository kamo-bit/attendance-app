import { createClient } from "@libsql/client";
import { pathToFileURL } from "node:url";

// Additive and idempotent: original uploads are never retained in this table.
export async function migrateProfilePhotos(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS profile_photos (
      user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data BLOB NOT NULL,
      version TEXT NOT NULL,
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
    await migrateProfilePhotos(client);
    console.log("Profile photos migration complete.");
  } catch {
    console.error("Profile photos migration failed. Check database access and schema.");
    process.exitCode = 1;
  } finally {
    client.close();
  }
}
