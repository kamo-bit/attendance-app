import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: [
        "http://localhost:3000",
        "https://*.vercel.app",
        process.env.BETTER_AUTH_URL,
    ].filter(Boolean) as string[],
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url, token }) => {
            console.log("\n\n==========================================")
            console.log("RESET PASSWORD LINK REQUESTED:")
            console.log(`User: ${user.email}`)
            console.log(`Link: ${url}`)
            console.log("==========================================\n\n")
        },
    }
});
