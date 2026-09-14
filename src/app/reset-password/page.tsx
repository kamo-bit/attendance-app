"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // If no token in URL, show invalid state immediately
  const hasToken = Boolean(token)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setStatus("error")
      setErrorMsg("Password tidak cocok")
      return
    }

    if (password.length < 8) {
      setStatus("error")
      setErrorMsg("Password minimal 8 karakter")
      return
    }

    setStatus("loading")
    setErrorMsg("")

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    })

    if (error) {
      setStatus("error")
      setErrorMsg(
        error.message?.includes("expired")
          ? "Link reset password sudah kadaluarsa. Silakan minta link baru."
          : error.message?.includes("invalid")
          ? "Link reset password tidak valid atau sudah pernah digunakan."
          : "Terjadi kesalahan. Silakan coba lagi."
      )
    } else {
      setStatus("success")
    }
  }

  // No token in URL — invalid access
  if (!hasToken) {
    return (
      <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 p-6 rounded-xl text-center space-y-3">
        <ShieldAlert className="w-10 h-10 mx-auto" />
        <h3 className="font-semibold text-lg">Link Tidak Valid</h3>
        <p className="text-sm opacity-80 leading-relaxed">
          Halaman ini hanya bisa diakses melalui link yang dikirim ke email kamu.<br />
          Silakan minta link reset password baru.
        </p>
        <Link href="/forgot-password" className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
          Minta Link Baru
        </Link>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="bg-primary/10 text-primary p-6 rounded-xl text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 mx-auto" />
        <h3 className="font-semibold text-lg">Password Berhasil Direset!</h3>
        <p className="text-sm opacity-80">Sekarang kamu bisa login dengan password baru kamu.</p>
        <Link href="/login" className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
          Login Sekarang
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "error" && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-lg text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">Password Baru</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pr-10"
            placeholder="Minimal 8 karakter"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1.5 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="pr-10"
            placeholder="Ulangi password baru"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1.5 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Menyimpan..." : "Simpan Password Baru"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="container flex items-center justify-center min-h-[80vh] py-10 px-4">
      <Card className="w-full max-w-md shadow-xl border rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 text-center bg-muted/30 pb-8 pt-8">
          <CardTitle className="text-2xl font-bold tracking-tight">Buat Password Baru</CardTitle>
          <CardDescription>
            Masukkan password baru kamu di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Memuat...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t py-4 justify-center">
          <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
