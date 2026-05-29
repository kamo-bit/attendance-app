import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://attendance-db-cala.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAwMzYxMzUsImlkIjoiMDE5ZTcyM2MtNTcwMS03OWY5LWJlMTYtNzE1ODc3MDgxNzQzIiwicmlkIjoiODBmNzM4MDMtNTMwOC00NGE5LThiNWMtOWFlOTc3OTc3MTBkIn0.6vOAVz_fhhusxO6OyOF56xCNN5vZIbF063frgTA_Et2TIpw6z7X9S-2I0xwMeFFLa5KOtjfQzk6FahSq1TGgDg",
});

async function main() {
  const users = await client.execute("SELECT * FROM users");
  console.log("USERS:", users.rows);
  
  const accounts = await client.execute("SELECT * FROM accounts");
  console.log("ACCOUNTS:", accounts.rows);
  
  const sessions = await client.execute("SELECT * FROM sessions");
  console.log("SESSIONS:", sessions.rows);
}

main().catch(console.error);
