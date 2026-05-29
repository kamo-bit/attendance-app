"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")
    
    // authClient automatically reads the token from the URL query params
    const { error } = await authClient.resetPassword({
      newPassword: password,
    })
    
    if (error) {
      setStatus("error")
      setErrorMsg(error.message || "Failed to reset password")
    } else {
      setStatus("success")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh] py-10 px-4">
      <Card className="w-full max-w-md shadow-xl border rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 text-center bg-muted/30 pb-8 pt-8">
          <CardTitle className="text-2xl font-bold tracking-tight">Create New Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {status === "success" ? (
            <div className="bg-emerald-500/10 text-emerald-600 p-6 rounded-lg text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto" />
              <h3 className="font-semibold text-lg">Password Reset Successfully</h3>
              <p className="text-sm text-emerald-600/80">
                You can now log in with your new password. Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    minLength={8}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {status === "error" && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {errorMsg}
                </div>
              )}
              
              <Button className="w-full mt-4" type="submit" disabled={status === "loading" || !password}>
                {status === "loading" ? "Saving..." : <><Lock className="mr-2 h-4 w-4" /> Save New Password</>}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pb-8">
          <div className="text-sm text-center text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
