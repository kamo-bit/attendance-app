"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  History,
  Wallet,
  LogOut,
  Coffee,
  Settings,
  ChevronDown,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="AbsenKuy, halaman utama">
      <span className="brand-mark" aria-hidden="true">
        <Clock3 />
      </span>
      <span>
        Absen<em>Kuy</em>
      </span>
    </Link>
  );
}
const links = [
  { href: "/", label: "Absensi", icon: Clock3 },
  { href: "/history", label: "Riwayat", icon: History },
  { href: "/salary-summary", label: "Pendapatan", icon: Wallet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(pathname);
  const { data: session } = authClient.useSession();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(
      new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    );
  }, []);
  const nav = links.map(({ href, label, icon: Icon }) => (
    <Link
      key={href}
      href={href}
      className="nav-link"
      aria-current={pathname === href ? "page" : undefined}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </Link>
  ));
  async function logout() {
    setBusy(true);
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
      setLogoutOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Belum berhasil keluar. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      {authPage ? (
        <header className="auth-header">
          <Brand href="/login" />
          <ThemeToggle />
        </header>
      ) : (
        <>
          <aside className="sidebar">
            <Brand />
            <nav className="side-nav" aria-label="Navigasi utama">
              {nav}
            </nav>
            <div className="sidebar-note">
              <Coffee size={25} />
              <strong>Kerja tercatat, pikiran tenang.</strong>
              <p>Jangan lupa luangkan waktu untuk istirahat.</p>
            </div>
          </aside>
          <header className="topbar">
            <Brand />
            <div className="topbar-date">
              <CalendarDays aria-hidden="true" />
              {date || "Catatan kerja harian"}
            </div>
            <nav className="tablet-nav" aria-label="Navigasi utama">
              {nav}
            </nav>
            <div className="account-tools">
              <ThemeToggle />
              {session && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="profile-menu-trigger"
                    aria-label="Menu akun"
                    title="Menu akun"
                  >
                    <UserAvatar key={session.user.id} name={session.user.name} image={session.user.image} />
                    <span className="profile-menu-name">{session.user.name}</span>
                    <ChevronDown className="profile-menu-chevron" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="account-menu">
                    <div className="account-menu-heading">
                      <strong>{session.user.name}</strong>
                      <span>{session.user.email}</span>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      render={<Link href="/settings" />}
                      aria-current={pathname === "/settings" ? "page" : undefined}
                    >
                      <Settings aria-hidden="true" />
                      Pengaturan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                      <LogOut aria-hidden="true" />
                      Keluar dari akun
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
          <nav className="bottom-nav" aria-label="Navigasi utama">
            {nav}
          </nav>
        </>
      )}
      <main id="main-content" className={authPage ? undefined : "app-main"}>
        {children}
      </main>
      <Dialog
        open={logoutOpen}
        onOpenChange={(open) => !busy && setLogoutOpen(open)}
      >
        <DialogContent className="dialog-panel">
          <DialogHeader>
            <DialogTitle>Keluar dari akun?</DialogTitle>
            <DialogDescription>
              Catatan yang sudah disimpan akan tetap tersedia saat kamu masuk
              kembali.
            </DialogDescription>
          </DialogHeader>
          <div className="actions actions-end">
            <button
              className="btn btn-outline"
              onClick={() => setLogoutOpen(false)}
              disabled={busy}
            >
              Batal
            </button>
            <button
              className="btn btn-primary"
              onClick={logout}
              disabled={busy}
            >
              {busy ? "Keluar…" : "Ya, keluar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
