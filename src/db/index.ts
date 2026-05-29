import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Create database client
const client = createClient({
  url: process.env.DATABASE_URL || "file:sqlite.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Initialize Drizzle with the connection
export const db = drizzle(client, { schema });
