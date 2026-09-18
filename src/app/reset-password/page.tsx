import { AuthScreen } from "@/components/auth-screen";
export const metadata = { title: "Buat kata sandi baru" };
export default function ResetPasswordPage() {
  return <AuthScreen mode="reset" />;
}
