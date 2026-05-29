"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { directResetPassword } from "@/app/actions"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setStatus("error")
      setErrorMsg("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setStatus("error")
      setErrorMsg("Password must be at least 8 characters")
      return
    }
    
    setStatus("loading")
    setErrorMsg("")
    
    const res = await directResetPassword(email, password)
    
    if (res?.error) {
      setStatus("error")
      setErrorMsg(res.error)
    } else if (res?.success) {
      setStatus("success")
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh] py-10 px-4">
      <Card className="w-full max-w-md shadow-xl border rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 text-center bg-muted/30 pb-8 pt-8">
          <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
          <CardDescription>
            Enter your email and your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {status === "success" ? (
            <div className="bg-primary/10 text-primary p-4 rounded-lg text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto" />
              <p className="font-medium">Password reset successfully!</p>
              <p className="text-sm opacity-80">You can now login with your new password.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === "error" && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={status === "loading"}>
                {status === "loading" ? "Saving..." : "Save New Password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t py-4 justify-center flex-col gap-2">
          <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
