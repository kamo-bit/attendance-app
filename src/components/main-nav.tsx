"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, LogOut } from "lucide-react"

import { authClient } from "@/lib/auth-client"

import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data: session, isPending } = authClient.useSession()

  const handleLogout = async () => {
    await authClient.signOut()
    setOpen(false)
    router.push("/login")
  }

  const navLinks = [
    { href: "/", label: "Today" },
    { href: "/history", label: "History" },
    { href: "/salary-summary", label: "Summary" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 md:px-8 max-w-screen-2xl mx-auto">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              Attendance App
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {(!isPending && session) && navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none flex items-center gap-2 md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <SheetHeader>
                  <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6 px-2">
                  <Link href="/" onClick={() => setOpen(false)} className="font-bold mb-2 text-lg">
                    Attendance App
                  </Link>
                  {(!isPending && session) && navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "text-base transition-colors hover:text-foreground/80",
                        pathname === link.href ? "text-foreground font-medium" : "text-foreground/60"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="h-px bg-border my-2 mr-6" />
                  {!isPending && session ? (
                    <button
                      onClick={handleLogout}
                      className="text-left text-foreground/60 hover:text-foreground transition-colors font-medium flex items-center"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="text-foreground/60 hover:text-foreground transition-colors font-medium"
                    >
                      Login / Register
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="font-bold truncate">Attendance App</Link>
          </div>
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            {!isPending && session ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:inline-flex">
                Logout
              </Button>
            ) : (
              <Link href="/login" className="hidden md:inline-flex text-sm font-medium hover:underline px-2 py-1">
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
