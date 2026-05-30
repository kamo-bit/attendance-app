"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { UserPlus, Eye, EyeOff, CheckCircle2, UserCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
    })
    
    if (error) {
      setError(error.message || "Failed to register")
      setLoading(false)
    } else {
      setSuccess(true)
      // Redirect to login after 2 seconds so user sees success message
      setTimeout(() => {
        router.push("/login")
      }, 2000)
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
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Premium Background Gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-2">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your details below to get started
          </p>
        </div>

        <Card className="shadow-2xl border-muted/60 bg-background/60 backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardContent className="space-y-6 pt-8">
            {success ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in zoom-in-95 duration-300">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-semibold">Account Created!</h3>
                  <p className="text-sm text-muted-foreground">
                    Redirecting you to the login page...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 text-center font-medium">
                    {error}
                  </div>
                )}
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="John Doe" 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="h-11 rounded-xl bg-background/50 transition-colors focus-visible:bg-background"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="m@example.com" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="h-11 rounded-xl bg-background/50 transition-colors focus-visible:bg-background"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="h-11 rounded-xl bg-background/50 pr-10 transition-colors focus-visible:bg-background"
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
                  <Button className="w-full h-11 rounded-xl text-base font-medium shadow-md transition-transform active:scale-[0.98] mt-2" type="submit" disabled={loading}>
                    {loading ? "Creating account..." : <><UserPlus className="mr-2 h-4 w-4" /> Sign Up</>}
                  </Button>
                </form>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background/80 px-2 text-muted-foreground backdrop-blur-sm">
                      Or continue with
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full h-11 rounded-xl bg-background/50 hover:bg-background/80 transition-colors" 
                  type="button" 
                  onClick={handleGoogleSignIn} 
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Sign up with Google
                </Button>
              </>
            )}
          </CardContent>
          {!success && (
            <CardFooter className="pb-8 pt-2">
              <div className="w-full text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline transition-all">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
