import { AuthScreen } from "@/components/auth-screen";
export const metadata = { title: "Buat akun" };
export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
