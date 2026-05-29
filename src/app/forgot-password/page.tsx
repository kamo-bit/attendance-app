"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"

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
    
    // As per Better Auth docs, it will generate a token and call sendResetPassword
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
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we will generate a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {status === "success" ? (
            <div className="bg-primary/10 text-primary p-6 rounded-xl text-center space-y-4">
              <Mail className="w-8 h-8 mx-auto" />
              <h3 className="font-semibold text-lg">Reset Link Generated!</h3>
              <p className="text-sm opacity-80 pb-2">
                Buka <strong>Terminal / CMD / VSCode</strong> tempat Anda menjalankan <code>npm run dev</code>. Anda akan melihat link aslinya tercetak di sana!
              </p>
              <p className="text-xs text-primary/70">
                (Silakan copy link yang ada di terminal dan paste di browser Anda)
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              {status === "error" && (
                <div className="text-sm text-destructive">Something went wrong. Please try again.</div>
              )}
              <Button className="w-full" type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pb-8">
          <div className="text-sm text-center text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
