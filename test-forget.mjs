import { auth } from "./src/lib/auth.ts";

async function main() {
  const result = await auth.api.forgetPassword({
    body: {
      email: "arontheprofesional@gmail.com",
      redirectTo: "/reset-password"
    },
    headers: new Headers()
  });
  console.log("Result:", result);
}

main().catch(console.error);
