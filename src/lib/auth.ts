import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { Resend } from "resend";
import { APIError } from "better-auth/api";
import { profileNameError } from "@/lib/user-settings";

const escapeEmailText = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

const resetPasswordEmailHtml = (userName: string, resetUrl: string) => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atur Ulang Kata Sandi — AbsenKuy</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e8c86 0%,#2ba8a2 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🔐 Atur Ulang Kata Sandi</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AbsenKuy</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.6;">
                Halo <strong>${escapeEmailText(userName)}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                Kami menerima permintaan untuk mengatur ulang kata sandi akun AbsenKuy kamu. Klik tombol di bawah untuk membuat kata sandi baru.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${resetUrl}" 
                       style="display:inline-block;background:linear-gradient(135deg,#1e8c86 0%,#2ba8a2 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                      Atur Ulang Kata Sandi Sekarang
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.6;">
                      ⚠️ <strong>Tautan ini hanya berlaku selama 1 jam</strong> dan hanya bisa digunakan sekali.<br/>
                      Jika kamu tidak merasa meminta pengaturan ulang kata sandi, abaikan email ini — akun kamu tetap aman.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                Jika tombol tidak bisa diklik, salin dan tempel tautan berikut ke peramban kamu:<br/>
                <a href="${resetUrl}" style="color:#146e69;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Email ini dikirim otomatis oleh <strong>AbsenKuy</strong>. Jangan balas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const auth = betterAuth({
    databaseHooks: {
        user: {
            update: {
                before: async (user) => {
                    if (user.name === undefined) return;
                    const error = profileNameError(user.name);
                    if (error) throw new APIError("BAD_REQUEST", { code: "INVALID_NAME", message: error });
                    return { data: { ...user, name: user.name.trim() } };
                },
            },
        },
    },
    baseURL: process.env.BETTER_AUTH_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    trustedOrigins: [
        "http://localhost:3000",
        "https://absenkuy.cc",
        "https://www.absenkuy.cc",
        "https://*.vercel.app",
        process.env.BETTER_AUTH_URL || "",
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    ].filter(Boolean) as string[],
    session: {
        expiresIn: 60 * 60 * 24 * 365, // 1 year
        updateAge: 60 * 60 * 24,
        cookieCache: {
            // Password changes must immediately revoke access on other devices.
            enabled: false,
        }
    },
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        },
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: "AbsenKuy <admin@absenkuy.cc>",
                    to: user.email,
                    subject: "Atur Ulang Kata Sandi — AbsenKuy",
                    html: resetPasswordEmailHtml(user.name || "Pengguna", url),
                });
                console.log(`[Auth] Reset password email sent to: ${user.email}`);
            } catch (e) {
                console.error("[Auth] Failed to send pengaturan ulang kata sandi email:", e);
            }
        },
    }
});
