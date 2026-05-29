import { createClient } from "@libsql/client";

async function main() {
  const email = "arontheprofesional@gmail.com"; // Let's check my test account or we can just fetch the user's account by looking at users table
  const client = createClient({
    url: "libsql://attendance-db-cala.aws-ap-northeast-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAwMzYxMzUsImlkIjoiMDE5ZTcyM2MtNTcwMS03OWY5LWJlMTYtNzE1ODc3MDgxNzQzIiwicmlkIjoiODBmNzM4MDMtNTMwOC00NGE5LThiNWMtOWFlOTc3OTc3MTBkIn0.6vOAVz_fhhusxO6OyOF56xCNN5vZIbF063frgTA_Et2TIpw6z7X9S-2I0xwMeFFLa5KOtjfQzk6FahSq1TGgDg",
  });
  
  const users = await client.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT 5");
  console.log("Users:", users.rows);
  
  const accounts = await client.execute("SELECT * FROM accounts LIMIT 5");
  console.log("Accounts:", accounts.rows);
}

main().catch(console.error);
