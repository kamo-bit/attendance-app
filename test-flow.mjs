import { createClient } from "@libsql/client";

async function main() {
  const email = "arontheprofesional@gmail.com";
  
  console.log("1. Requesting forget password via HTTP...");
  const res = await fetch("http://localhost:3000/api/auth/forget-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectTo: "/reset-password" })
  });
  
  if (res.status === 404) {
    // try the correct endpoint
    const res2 = await fetch("http://localhost:3000/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo: "/reset-password" })
    });
    console.log("HTTP request-password-reset:", res2.status, await res2.text());
  } else {
    console.log("HTTP forget-password:", res.status, await res.text());
  }
  
  console.log("2. Checking DB...");
  const client = createClient({
    url: "libsql://attendance-db-cala.aws-ap-northeast-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAwMzYxMzUsImlkIjoiMDE5ZTcyM2MtNTcwMS03OWY5LWJlMTYtNzE1ODc3MDgxNzQzIiwicmlkIjoiODBmNzM4MDMtNTMwOC00NGE5LThiNWMtOWFlOTc3OTc3MTBkIn0.6vOAVz_fhhusxO6OyOF56xCNN5vZIbF063frgTA_Et2TIpw6z7X9S-2I0xwMeFFLa5KOtjfQzk6FahSq1TGgDg",
  });
  
  const verifications = await client.execute("SELECT * FROM verifications ORDER BY created_at DESC LIMIT 1");
  console.log("LATEST VERIFICATION:", verifications.rows[0]);
}

main().catch(console.error);
