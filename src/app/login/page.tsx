"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { LogIn, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Check for error in URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get("error")
      if (errorParam) {
        setError(`Authentication Error: ${errorParam}`)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    })
    
    if (authError) {
      setError(authError.message || "Failed to login")
      setLoading(false)
    } else {
      router.push("/")
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    
    const { error: authError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    })
    
    if (authError) {
      setError(authError.message || "Failed to login with Google")
      setLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[85vh] py-10 px-4">
      <Card className="w-full max-w-lg shadow-2xl border rounded-3xl overflow-hidden">
        <CardHeader className="space-y-2 text-center bg-muted/30 pb-10 pt-10">
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Enter your email and password to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-8">
          {error && <div className="text-sm text-center text-destructive">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="text-base py-6" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-base">Password</Label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="text-base py-6" />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1.5 h-auto py-2 hover:bg-transparent text-muted-foreground" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            <Button className="w-full text-base py-6" size="lg" type="submit" disabled={loading}>
              {loading ? "Signing in..." : <><LogIn className="mr-2 h-5 w-5" /> Sign In</>}
            </Button>
          </form>
          
          <div className="relative pt-2 pb-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground text-sm">Or continue with</span>
            </div>
          </div>
          <Button variant="outline" type="button" size="lg" className="w-full text-base py-6" onClick={handleGoogleSignIn} disabled={loading}>
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pb-8">
          <div className="text-base text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
