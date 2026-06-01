"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, LogOut, User } from "lucide-react"

import { authClient } from "@/lib/auth-client"

import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
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
                    <>
                      <div className="flex items-center gap-3 py-2 mr-6">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold truncate">{session.user?.name || "User"}</span>
                          <span className="text-xs text-muted-foreground truncate">{session.user?.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLogoutDialog(true)}
                        className="text-left text-foreground/60 hover:text-foreground transition-colors font-medium flex items-center"
                      >
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </button>
                    </>
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
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50 border">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-sm font-medium max-w-[120px] truncate">{session.user?.name || session.user?.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowLogoutDialog(true)}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login" className="hidden md:inline-flex text-sm font-medium hover:underline px-2 py-1">
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
