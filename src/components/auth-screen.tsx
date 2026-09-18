"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coffee,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Mail,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Mode = "login" | "register" | "forgot" | "reset";
const copy = {
  login: {
    title: "Selamat datang kembali",
    description: "Catat jam kerja dan pantau estimasi pendapatanmu.",
    action: "Masuk",
  },
  register: {
    title: "Buat akun AbsenKuy",
    description: "Mulai catat jam kerja. Biar hitungan pendapatan lebih mudah.",
    action: "Buat akun",
  },
  forgot: {
    title: "Lupa kata sandi?",
    description:
      "Masukkan email untuk menerima tautan pengaturan ulang kata sandi.",
    action: "Kirim tautan reset",
  },
  reset: {
    title: "Buat kata sandi baru",
    description: "Gunakan kata sandi baru untuk mengakses akunmu.",
    action: "Simpan kata sandi",
  },
};
function PasswordField({
  id,
  label,
  value,
  onChange,
  fresh,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  fresh?: boolean;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {!fresh && (
          <Link className="inline-link" href="/forgot-password">
            Lupa kata sandi?
          </Link>
        )}
      </div>
      <div className="password-field">
        <input
          className="form-input"
          id={id}
          type={show ? "text" : "password"}
          autoComplete={fresh ? "new-password" : "current-password"}
          required
          minLength={fresh ? 8 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fresh ? "Minimal 8 karakter" : "Masukkan kata sandi"}
          aria-invalid={invalid}
        />
        <button
          type="button"
          aria-label={`${show ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`}
          aria-pressed={show}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </div>
  );
}
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.78.5 3.82 1.5l2.86-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59c.8-2.36 3-4.12 5.6-4.12Z"
      />
    </svg>
  );
}
export function AuthScreen({ mode }: { mode: Mode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(mode !== "reset");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    setReady(true);
    if (params.get("error")) {
      if (mode === "reset") setExpired(true);
      else setError("Proses masuk belum berhasil. Silakan coba lagi.");
    }
  }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register" && !name.trim()) {
      setError("Isi nama lengkapmu terlebih dahulu.");
      return;
    }
    if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Masukkan alamat email yang valid, misalnya nama@contoh.com.");
      return;
    }
    if (mode === "login" && !password) {
      setError("Masukkan kata sandimu terlebih dahulu.");
      return;
    }
    if ((mode === "register" || mode === "reset") && password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (mode === "reset" && password !== confirmation) {
      setError("Konfirmasi kata sandi belum cocok.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          rememberMe: true,
        });
        if (result.error) {
          setError(
            result.error.status === 429
              ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."
              : "Email atau kata sandi tidak cocok. Periksa kembali dan coba lagi.",
          );
          return;
        }
        window.location.assign("/");
      } else if (mode === "register") {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(
            result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
              result.error.code === "USER_ALREADY_EXISTS"
              ? "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain."
              : "Akun belum berhasil dibuat. Periksa data dan coba lagi.",
          );
          return;
        }
        setSuccess(true);
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: "/reset-password",
        });
        if (result.error) {
          setError(
            "Permintaan belum berhasil dikirim. Tunggu sebentar lalu coba lagi.",
          );
          return;
        }
        setSuccess(true);
      } else {
        if (!token) {
          setExpired(true);
          return;
        }
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (result.error) {
          const code =
            `${result.error.code} ${result.error.message}`.toLowerCase();
          if (code.includes("token") || code.includes("expired"))
            setExpired(true);
          else
            setError("Kata sandi belum berhasil disimpan. Silakan coba lagi.");
          return;
        }
        setSuccess(true);
      }
    } catch {
      setError("Koneksi terputus. Periksa jaringan dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (result.error)
        setError("Belum berhasil terhubung ke Google. Silakan coba lagi.");
    } catch {
      setError("Koneksi ke Google terputus. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  const invalid = mode === "reset" && ready && (!token || expired);
  const Icon =
    mode === "forgot" ? Mail : mode === "reset" ? KeyRound : UserRound;
  return (
    <div className="auth-layout">
      <aside className="auth-art" aria-label="Tentang AbsenKuy">
        <div>
          <span className="ribbon">SEDIKIT CATATAN, BANYAK KETENANGAN</span>
          <h2>
            Setiap jam kerja
            <br />
            punya cerita.
          </h2>
          <p>
            Dari jam masuk hingga waktu istirahat, semua tercatat rapi. Fokus
            bekerja, hitungannya bersama AbsenKuy.
          </p>
        </div>
        <div className="clock-art" aria-hidden="true">
          <span className="spark">✳</span>
          <div className="clock-face">
            <Clock3 />
          </div>
          <div className="coffee-art">
            <Coffee />
          </div>
        </div>
        <div>
          <span className="art-tag">
            <CheckCircle2 />
            Jam kerja jelas. Pendapatan terpantau.
          </span>
        </div>
      </aside>
      <section className="auth-form-area">
        <span className="icon-tile mb-5">
          <Icon />
        </span>
        <h1>
          {invalid
            ? "Tautan tidak berlaku"
            : success
              ? mode === "forgot"
                ? "Periksa emailmu"
                : mode === "register"
                  ? "Akun berhasil dibuat"
                  : "Kata sandi diperbarui"
              : copy[mode].title}
        </h1>
        <p className="auth-description">
          {invalid
            ? "Tautan pengaturan ulang tidak valid, sudah digunakan, atau kedaluwarsa."
            : success
              ? mode === "forgot"
                ? "Langkah selanjutnya ada di kotak masukmu."
                : "Kamu sudah siap melanjutkan catatan kerjamu."
              : copy[mode].description}
        </p>
        {invalid ? (
          <div className="stack">
            <div className="notice warning">
              <ShieldAlert />
              <p>
                Minta tautan baru untuk membuat kata sandi. Tautan sebelumnya
                tidak bisa digunakan kembali.
              </p>
            </div>
            <Link className="btn btn-primary" href="/forgot-password">
              Minta tautan baru
              <ArrowRight />
            </Link>
          </div>
        ) : success ? (
          <div className="stack">
            <div className="notice">
              <CheckCircle2 />
              <p>
                {mode === "forgot" ? (
                  <>
                    Jika akun dengan email <strong>{email}</strong> terdaftar,
                    tautan pengaturan ulang telah dikirim. Periksa juga folder
                    spam.
                  </>
                ) : mode === "register" ? (
                  "Akunmu berhasil dibuat. Mulai catat jam kerja pertamamu."
                ) : (
                  "Kata sandi baru berhasil disimpan. Gunakan kata sandi ini saat masuk."
                )}
              </p>
            </div>
            {mode === "forgot" ? (
              <>
                <p className="field-help">
                  Tautan berlaku selama 1 jam. Jika belum diterima, periksa
                  alamat email dan coba kirim ulang.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSuccess(false)}
                >
                  Kembali ke formulir
                </button>
              </>
            ) : (
              <Link
                className="btn btn-primary"
                href={mode === "register" ? "/" : "/login"}
              >
                {mode === "register" ? "Mulai mencatat" : "Masuk sekarang"}
                <ArrowRight />
              </Link>
            )}
          </div>
        ) : !ready ? (
          <p role="status">Memuat formulir…</p>
        ) : (
          <>
            <form onSubmit={submit} className="auth-form" noValidate>
              {error && (
                <div role="alert" className="notice error">
                  <Info />
                  <p>{error}</p>
                </div>
              )}
              {mode === "register" && (
                <div className="field">
                  <label htmlFor="full-name">Nama lengkap</label>
                  <input
                    id="full-name"
                    className="form-input"
                    autoComplete="name"
                    placeholder="Nama lengkapmu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
              )}
              {mode !== "reset" && (
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="form-input"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@contoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              {mode !== "forgot" && (
                <PasswordField
                  id="password"
                  label={mode === "reset" ? "Kata sandi baru" : "Kata sandi"}
                  value={password}
                  onChange={setPassword}
                  fresh={mode !== "login"}
                />
              )}
              {mode === "reset" && (
                <PasswordField
                  id="confirm-password"
                  label="Konfirmasi kata sandi baru"
                  value={confirmation}
                  onChange={setConfirmation}
                  fresh
                  invalid={Boolean(confirmation && password !== confirmation)}
                />
              )}
              {(mode === "register" || mode === "reset") && (
                <p className="field-help">
                  Gunakan minimal 8 karakter untuk kata sandimu.
                </p>
              )}
              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={busy}
              >
                {busy ? "Memproses…" : copy[mode].action}
                <ArrowRight />
              </button>
            </form>
            {(mode === "login" || mode === "register") && (
              <>
                <div className="auth-divider">atau</div>
                <button
                  type="button"
                  className="btn btn-outline btn-full"
                  disabled={busy}
                  onClick={google}
                >
                  <GoogleMark />
                  Lanjutkan dengan Google
                </button>
                <p className="auth-footer">
                  {mode === "login" ? (
                    <>
                      Belum punya akun?{" "}
                      <Link className="inline-link" href="/register">
                        Buat akun
                      </Link>
                    </>
                  ) : (
                    <>
                      Sudah punya akun?{" "}
                      <Link className="inline-link" href="/login">
                        Masuk
                      </Link>
                    </>
                  )}
                </p>
              </>
            )}
          </>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <Link className="text-button auth-back" href="/login">
            <ArrowLeft />
            Kembali ke halaman masuk
          </Link>
        )}
      </section>
    </div>
  );
}
