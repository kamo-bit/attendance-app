import { AuthScreen } from "@/components/auth-screen";
export const metadata = { title: "Lupa kata sandi" };
export default function ForgotPasswordPage() {
  return <AuthScreen mode="forgot" />;
}
