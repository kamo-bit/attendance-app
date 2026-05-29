import { auth } from "./src/lib/auth.ts";

async function main() {
  const email = "arontheprofesional@gmail.com";
  
  console.log("1. Requesting reset...");
  const reqRes = await auth.api.forgetPassword({
    body: {
      email,
      redirectTo: "/reset-password"
    },
    headers: new Headers()
  });
  console.log("Forget password triggered:", reqRes);
  
  await new Promise(r => setTimeout(r, 2000));
  
  const { developmentResetLinks } = await import("./src/lib/auth.ts");
  const link = developmentResetLinks.get(email);
  console.log("Generated Link:", link);
  
  if (!link) {
    console.log("No link found!");
    return;
  }
  
  const token = new URL(link).searchParams.get("token");
  console.log("Extracted Token:", token);
  
  console.log("2. Attempting to reset password...");
  try {
    const resetRes = await auth.api.resetPassword({
      body: {
        newPassword: "password123456",
        token: token
      },
      headers: new Headers()
    });
    console.log("Reset successful:", resetRes);
  } catch (e) {
    console.log("Reset failed:", e.message || e);
  }
}

main().catch(console.error);
