import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    trustedOrigins: ["https://*.vercel.app", "http://localhost:3000", process.env.BETTER_AUTH_URL as string].filter(Boolean),
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
