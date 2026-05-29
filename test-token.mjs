import { auth } from "./src/lib/auth.ts";

async function main() {
  const email = "arontheprofesional@gmail.com";
  
  const reqRes = await auth.api.forgetPassword({
    body: {
      email,
      redirectTo: "/reset-password"
    },
    headers: new Headers()
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  const { developmentResetLinks } = await import("./src/lib/auth.ts");
  const link = developmentResetLinks.get(email);
  console.log("Generated Link:", link);
}

main().catch(console.error);
