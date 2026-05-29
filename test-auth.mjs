async function main() {
  const email = "arontheprofesional@gmail.com";
  
  // 1. Request forgot password
  const req = await fetch("http://localhost:3000/api/auth/forget-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, redirectTo: "/reset-password" })
  });
  
  const res = await req.json();
  console.log("Forget password response:", res);
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
}

main().catch(console.error);
