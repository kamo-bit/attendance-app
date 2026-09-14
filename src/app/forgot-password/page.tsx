"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    })

    if (error) {
      setStatus("error")
    } else {
      setStatus("success")
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh] py-10 px-4">
      <Card className="w-full max-w-md shadow-xl border rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 text-center bg-muted/30 pb-8 pt-8">
          <CardTitle className="text-2xl font-bold tracking-tight">Lupa Password?</CardTitle>
          <CardDescription>
            Masukkan email kamu dan kami akan mengirimkan link untuk reset password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {status === "success" ? (
            <div className="bg-primary/10 text-primary p-6 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto" />
              <h3 className="font-semibold text-lg">Email Terkirim!</h3>
              <p className="text-sm opacity-80 leading-relaxed">
                Kami sudah mengirimkan link reset password ke <strong>{email}</strong>.<br />
                Cek inbox (atau folder spam) kamu dan klik link yang ada di email tersebut.
              </p>
              <p className="text-xs opacity-60 pt-2">
                Link akan kadaluarsa dalam <strong>1 jam</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === "error" && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Email tidak ditemukan atau terjadi kesalahan. Pastikan email sudah terdaftar.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@contoh.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Button className="w-full" type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Mengirim..." : "Kirim Link Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pb-8">
          <div className="text-sm text-center text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Kembali ke login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
