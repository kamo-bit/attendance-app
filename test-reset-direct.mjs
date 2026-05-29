async function main() {
  const token = "uVksENPrb8mEC3akhe6sqzPNHVSMouBC"; // Assuming this is the raw token, let's see if it works!
  
  const res = await fetch("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword: "password123", token })
  });
  
  console.log("HTTP reset-password:", res.status, await res.text());
}
main().catch(console.error);
