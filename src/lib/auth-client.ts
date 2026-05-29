import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Dynamically use the current domain - works on localhost AND Vercel
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
});
export const { signIn, signUp, signOut, useSession } = authClient;
