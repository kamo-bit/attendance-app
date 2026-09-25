"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LoaderCircle,
  Mail,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { UserAvatar } from "@/components/user-avatar";
import { passwordChangeError, profileNameError } from "@/lib/user-settings";
import { updateSalarySettings } from "@/app/actions";
import { getUserSettings, saveEmailPreference } from "./actions";
import "./settings.css";

type UserSettings = Awaited<ReturnType<typeof getUserSettings>>;
type AuthError = { code?: string; status?: number };

function authErrorMessage(error: AuthError, fallback: string) {
  if (error.status === 429)
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (error.code === "SESSION_EXPIRED" || error.status === 401)
    return "Sesi perlu diperbarui. Silakan keluar lalu masuk kembali sebelum mencoba lagi.";
  if (error.code === "INVALID_PASSWORD")
    return "Kata sandi saat ini tidak cocok. Periksa kembali dan coba lagi.";
  if (error.code === "PASSWORD_TOO_SHORT") return "Kata sandi baru minimal 8 karakter.";
  if (error.code === "PASSWORD_TOO_LONG") return "Kata sandi baru maksimal 128 karakter.";
  if (error.code === "CREDENTIAL_ACCOUNT_NOT_FOUND")
    return "Akun ini belum memiliki kata sandi. Gunakan metode masuk yang terhubung ke akunmu.";
  if (error.code === "INVALID_NAME") return "Isi nama antara 1 dan 80 karakter.";
  return fallback;
}

function useActive() {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  return active;
}

export default function SettingsPage() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const router = useRouter();
  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);
  if (!session) return <SettingsLoading />;
  return <SettingsLoader key={session.user.id} refreshSession={refetch} />;
}

function SettingsLoading({ error, retry }: { error?: string; retry?: () => void }) {
  return (
    <div className="page settings-page">
      <div className="loading-state" role={error ? "alert" : "status"}>
        {error ? <Info style={{ animation: "none" }} aria-hidden="true" /> : <LoaderCircle aria-hidden="true" />}
        <p>{error || "Memuat pengaturan akunmu…"}</p>
        {error && <button className="btn btn-secondary" onClick={retry}><RefreshCw aria-hidden="true" />Coba lagi</button>}
      </div>
    </div>
  );
}

function SettingsLoader({ refreshSession }: { refreshSession: () => Promise<void> }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getUserSettings().then((result) => {
      if (active) { setSettings(result); setError(""); }
    }).catch(() => {
      if (active) setError("Pengaturan belum bisa dimuat. Periksa koneksi lalu coba lagi.");
    });
    return () => { active = false; };
  }, [attempt]);
  if (!settings || error)
    return <SettingsLoading error={error} retry={() => { setError(""); setAttempt((value) => value + 1); }} />;
  return (
    <div className="page settings-page">
      <div className="eyebrow">AbsenKuy / Akunmu</div>
      <header className="page-heading">
        <div>
          <h1>Pengaturan</h1>
          <p>Atur profil, preferensi kerja, dan kenyamanan akunmu dalam satu tempat.</p>
        </div>
        <span className="settings-heading-icon" aria-hidden="true"><SlidersHorizontal /></span>
      </header>
      <div className="settings-grid">
        <ProfileSection settings={settings} refreshSession={refreshSession} />
        <WageSection initialWage={settings.wage} />
        <ThemeSection />
        <EmailSection initialEnabled={settings.salaryEmailEnabled} email={settings.email} />
        <SecuritySection hasPassword={settings.hasPassword} hasGoogle={settings.providers.includes("google")} refreshSession={refreshSession} />
      </div>
    </div>
  );
}

function SectionHeading({ id, icon, title, description, gold = false }: {
  id: string; icon: ReactNode; title: string; description: string; gold?: boolean;
}) {
  return (
    <div className="settings-section-heading">
      <span className={`icon-tile${gold ? " gold" : ""}`} aria-hidden="true">{icon}</span>
      <div><h2 id={id}>{title}</h2><p>{description}</p></div>
    </div>
  );
}

function Feedback({ id, error, success }: { id: string; error: string; success: string }) {
  return (
    <div id={id} className="settings-feedback">
      {error && <p className="notice error" role="alert"><Info aria-hidden="true" /><span>{error}</span></p>}
      {!error && success && <p className="notice" role="status"><CheckCircle2 aria-hidden="true" /><span>{success}</span></p>}
    </div>
  );
}

function SaveButton({ busy, disabled, children }: { busy: boolean; disabled?: boolean; children: ReactNode }) {
  return <button type="submit" className="btn btn-primary" disabled={busy || disabled}>{busy ? <LoaderCircle className="settings-spinner" aria-hidden="true" /> : <Save aria-hidden="true" />}{busy ? "Menyimpan…" : children}</button>;
}

function ProfileSection({ settings, refreshSession }: { settings: UserSettings; refreshSession: () => Promise<void> }) {
  const [name, setName] = useState(settings.name);
  const [savedName, setSavedName] = useState(settings.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const active = useActive();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSuccess("");
    const validation = profileNameError(name);
    setError(validation || "");
    if (validation) return;
    setBusy(true);
    const nextName = name.trim();
    try {
      const result = await authClient.updateUser({ name: nextName });
      if (!active.current) return;
      if (result.error) {
        setError(authErrorMessage(result.error, "Nama belum tersimpan. Silakan coba lagi."));
        return;
      }
      setName(nextName);
      setSavedName(nextName);
      setSuccess("Nama profil berhasil diperbarui.");
      await refreshSession().catch(() => {
        if (active.current) setSuccess("Nama profil berhasil diperbarui. Muat ulang halaman jika nama belum berubah.");
      });
    } catch {
      if (active.current) setError("Nama belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally { if (active.current) setBusy(false); }
  }
  return (
    <section className="panel settings-card" aria-labelledby="settings-profile-title">
      <SectionHeading id="settings-profile-title" icon={<UserRound />} title="Profil" description="Identitas yang tampil di akun AbsenKuy." />
      <ProfilePhoto initialImage={settings.image} name={savedName} refreshSession={refreshSession} />
      <form className="settings-form" onSubmit={save} noValidate>
        <div className="field">
          <label htmlFor="settings-name">Nama lengkap</label>
          <input id="settings-name" className="form-input" autoComplete="name" value={name} maxLength={80} disabled={busy} required aria-invalid={Boolean(error)} aria-describedby="profile-feedback" onChange={(event) => { setName(event.target.value); setError(""); setSuccess(""); }} />
        </div>
        <div className="field">
          <label htmlFor="settings-email">Email akun</label>
          <input id="settings-email" className="form-input settings-readonly" type="email" autoComplete="email" value={settings.email} readOnly aria-describedby="settings-email-help" />
          <p id="settings-email-help" className="field-help">Email digunakan untuk masuk dan menerima ringkasan pendapatan. Alamat ini tidak dapat diubah di sini.</p>
        </div>
        <div className="settings-login-methods">
          <p className="field-label">Metode masuk</p>
          <div className="settings-badges">
            {settings.hasPassword && <span className="settings-badge"><KeyRound aria-hidden="true" />Email dan kata sandi</span>}
            {settings.providers.includes("google") && <span className="settings-badge"><span aria-hidden="true" className="settings-google-mark">G</span>Google</span>}
            {!settings.hasPassword && !settings.providers.includes("google") && <span className="settings-badge"><Mail aria-hidden="true" />Akun email</span>}
          </div>
        </div>
        <Feedback id="profile-feedback" error={error} success={success} />
        <div className="settings-form-footer"><SaveButton busy={busy} disabled={name.trim() === savedName}>Simpan profil</SaveButton></div>
      </form>
    </section>
  );
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

async function photoResponseError(response: Response, fallback: string) {
  if (response.status === 413) return "Ukuran foto maksimal 2 MB. Pilih foto yang lebih kecil.";
  if (response.status === 401) return "Sesi berakhir. Silakan masuk kembali untuk mengubah foto.";
  const result: unknown = await response.json().catch(() => null);
  return result && typeof result === "object" && "error" in result && typeof result.error === "string"
    ? result.error
    : fallback;
}

function ProfilePhoto({ initialImage, name, refreshSession }: {
  initialImage: string | null;
  name: string;
  refreshSession: () => Promise<void>;
}) {
  const [currentImage, setCurrentImage] = useState(initialImage);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "previewing" | "saving">("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const previewUrl = useRef<string | null>(null);
  const active = useActive();

  useEffect(() => () => {
    requestId.current += 1;
    controller.current?.abort();
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  function clearPreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  }

  function cancel() {
    if (phase === "saving") return;
    requestId.current += 1;
    controller.current?.abort();
    clearPreview();
    setFile(null);
    setPhase("idle");
    setError("");
    setSuccess("");
  }

  async function selectPhoto(nextFile: File) {
    controller.current?.abort();
    const id = ++requestId.current;
    clearPreview();
    setFile(null);
    setError("");
    setSuccess("");
    setPhase("idle");
    if (nextFile.size > MAX_PHOTO_BYTES) {
      setError("Ukuran foto maksimal 2 MB. Pilih foto yang lebih kecil.");
      return;
    }
    if (nextFile.size === 0) {
      setError("File foto kosong. Pilih foto lain.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setFile(nextFile);
    setPhase("previewing");
    try {
      const response = await fetch("/api/profile-photo", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: nextFile,
        signal: request.signal,
      });
      if (!response.ok) throw new Error(await photoResponseError(response, "Foto belum bisa diproses. Pilih foto lain atau coba lagi."));
      if (response.headers.get("content-type")?.split(";")[0].trim() !== "image/webp")
        throw new Error("Pratinjau foto tidak valid. Silakan coba lagi.");
      const blob = await response.blob();
      if (!active.current || id !== requestId.current) return;
      if (!blob.size) throw new Error("Pratinjau foto kosong. Silakan pilih foto lain.");
      const url = URL.createObjectURL(blob);
      previewUrl.current = url;
      setPreview(url);
    } catch (cause) {
      if (!active.current || id !== requestId.current || request.signal.aborted) return;
      setFile(null);
      setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "Pratinjau belum bisa dimuat. Periksa koneksi lalu pilih foto lagi.");
    } finally {
      if (active.current && id === requestId.current) setPhase("idle");
    }
  }

  async function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !preview || phase !== "idle") return;
    controller.current?.abort();
    const id = ++requestId.current;
    const request = new AbortController();
    controller.current = request;
    setPhase("saving");
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/profile-photo", {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
        signal: request.signal,
      });
      if (!response.ok) throw new Error(await photoResponseError(response, "Foto belum tersimpan. Silakan coba lagi."));
      const result: unknown = await response.json();
      if (!active.current || id !== requestId.current) return;
      if (!result || typeof result !== "object" || !("image" in result) || typeof result.image !== "string")
        throw new Error("Status foto belum dapat dipastikan. Muat ulang halaman sebelum mencoba lagi.");
      setCurrentImage(result.image);
      clearPreview();
      setFile(null);
      setSuccess("Foto profil berhasil diperbarui.");
      await refreshSession().catch(() => {
        if (active.current && id === requestId.current)
          setSuccess("Foto profil berhasil disimpan. Muat ulang halaman jika foto di menu akun belum berubah.");
      });
    } catch (cause) {
      if (!active.current || id !== requestId.current || request.signal.aborted) return;
      setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "Foto belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      if (active.current && id === requestId.current) setPhase("idle");
    }
  }

  return (
    <form className="settings-photo-form" onSubmit={savePhoto} aria-labelledby="settings-photo-title">
      <div className="settings-photo-row">
        <UserAvatar image={preview || currentImage} name={name} className="settings-photo-avatar" label={preview ? "Pratinjau foto profil baru" : "Foto profil saat ini"} />
        <div className="settings-photo-content">
          <h3 id="settings-photo-title">Foto profil</h3>
          <p className="field-help" id="settings-photo-help">Maksimal 2 MB. Mendukung JPG, PNG, WebP, HEIC, GIF, dan format gambar lainnya. GIF menjadi foto diam.</p>
          <input ref={fileInput} id="settings-photo-file" type="file" hidden accept="image/*,.heic,.heif,.tif,.tiff,.bmp,.ico" disabled={phase === "saving"} onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (selected) void selectPhoto(selected);
          }} />
          <button type="button" className="btn btn-secondary settings-photo-choose" aria-describedby="settings-photo-help" disabled={phase === "saving"} onClick={() => fileInput.current?.click()}><Camera aria-hidden="true" />{file ? "Pilih foto lain" : "Pilih foto"}</button>
        </div>
      </div>
      {file && <p className="settings-photo-file-name">{file.name} <span>· {(file.size / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 2 })} MB</span></p>}
      {phase === "previewing" && <p className="settings-photo-progress" role="status"><LoaderCircle className="settings-spinner" aria-hidden="true" />Menyiapkan pratinjau foto…</p>}
      {preview && <p className="field-help">Pratinjau foto baru. Pilih Simpan foto untuk menerapkannya ke akunmu.</p>}
      <Feedback id="photo-feedback" error={error} success={success} />
      {file && <div className="settings-photo-actions">
        <button type="button" className="btn btn-outline" disabled={phase === "saving"} onClick={cancel}>Batalkan</button>
        <SaveButton busy={phase === "saving"} disabled={!preview || phase === "previewing"}>Simpan foto</SaveButton>
      </div>}
    </form>
  );
}

function WageSection({ initialWage }: { initialWage: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // Settings load asynchronously, after Next.js initially handles the hash.
    if (window.location.hash === "#settings-work") {
      sectionRef.current?.focus({ preventScroll: true });
      sectionRef.current?.scrollIntoView({ block: "start" });
    }
  }, []);
  const [value, setValue] = useState(String(initialWage));
  const [savedWage, setSavedWage] = useState(initialWage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const active = useActive();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSuccess("");
    const rate = Number(value);
    if (!Number.isSafeInteger(rate) || rate < 1 || rate > 1_000_000) {
      setError("Isi upah per jam antara ¥1 dan ¥1.000.000 tanpa desimal.");
      return;
    }
    setBusy(true); setError("");
    try {
      const result = await updateSalarySettings(rate);
      if (!active.current) return;
      if (result.error) { setError(result.error); return; }
      setSavedWage(rate); setValue(String(rate));
      setSuccess("Tarif default berhasil disimpan untuk catatan absensi baru.");
    } catch {
      if (active.current) setError("Tarif belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally { if (active.current) setBusy(false); }
  }
  return (
    <section id="settings-work" ref={sectionRef} tabIndex={-1} className="panel panel-gold settings-card" aria-labelledby="settings-work-title">
      <SectionHeading id="settings-work-title" icon={<Wallet />} title="Pengaturan kerja" description="Nilai awal untuk menghitung pendapatanmu." gold />
      <form className="settings-form" noValidate onSubmit={save}>
        <div className="field">
          <label htmlFor="settings-wage">Tarif default per jam</label>
          <div className="money-input"><span aria-hidden="true">¥</span><input id="settings-wage" className="form-input" type="number" inputMode="numeric" min={1} max={1_000_000} step={1} required disabled={busy} value={value} aria-invalid={Boolean(error)} aria-describedby="settings-wage-help wage-feedback" onChange={(event) => { setValue(event.target.value); setError(""); setSuccess(""); }} /></div>
          <p id="settings-wage-help" className="field-help">Yen Jepang (JPY), tanpa desimal.</p>
        </div>
        <div className="notice"><Info aria-hidden="true" /><p>Tarif baru berlaku untuk catatan absensi baru. Catatan dan draf yang sudah tersimpan tetap memakai tarif saat dicatat.</p></div>
        <p className="field-help">Hari libur dapat dikelola melalui kalender pada halaman <Link className="inline-link" href="/salary-summary">Pendapatan</Link>.</p>
        <Feedback id="wage-feedback" error={error} success={success} />
        <div className="settings-form-footer"><SaveButton busy={busy} disabled={Number(value) === savedWage}>Simpan tarif</SaveButton></div>
      </form>
    </section>
  );
}

const themeChoices = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const [success, setSuccess] = useState("");
  return (
    <section className="panel settings-card" aria-labelledby="settings-theme-title">
      <SectionHeading id="settings-theme-title" icon={<Palette />} title="Tampilan" description="Pilih tema yang nyaman untukmu." />
      <fieldset className="settings-theme-group" aria-describedby="settings-theme-help">
        <legend className="field-label">Tema aplikasi</legend>
        <div className="settings-theme-options">
          {themeChoices.map(({ value, label, icon: Icon }) => (
            <label className="settings-theme-option" key={value}>
              <input type="radio" name="settings-theme" value={value} checked={theme === value} onChange={() => { setTheme(value); setSuccess(`Tema ${label.toLowerCase()} diterapkan.`); }} />
              <span className="settings-theme-choice"><Icon aria-hidden="true" /><span>{label}</span><Check className="settings-theme-check" aria-hidden="true" /></span>
            </label>
          ))}
        </div>
      </fieldset>
      <p id="settings-theme-help" className="field-help">Tema langsung tersimpan di browser ini. Pilih Sistem untuk mengikuti mode terang atau gelap perangkatmu.</p>
      <Feedback id="theme-feedback" error="" success={success} />
    </section>
  );
}

function EmailSection({ initialEnabled, email }: { initialEnabled: boolean; email: string }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saved, setSaved] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const active = useActive();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await saveEmailPreference(enabled);
      if (!active.current) return;
      if ("error" in result) { setError(result.error); return; }
      setSaved(enabled);
      setSuccess(enabled ? "Email ringkasan pendapatan diaktifkan." : "Email ringkasan pendapatan dinonaktifkan.");
    } catch {
      if (active.current) setError("Preferensi email belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally { if (active.current) setBusy(false); }
  }
  return (
    <section className="panel panel-gold settings-card" aria-labelledby="settings-notification-title">
      <SectionHeading id="settings-notification-title" icon={<BellRing />} title="Notifikasi email" description="Ringkasan pendapatan langsung ke kotak masuk." gold />
      <form className="settings-form" onSubmit={save}>
        <div className="settings-toggle-row">
          <div><label className="field-label" id="settings-email-toggle-label" htmlFor="settings-email-toggle">Ringkasan pendapatan bulanan</label><p className="field-help">{enabled ? "Aktif" : "Nonaktif"}{enabled !== saved ? " · Belum disimpan" : ""}</p></div>
          <button id="settings-email-toggle" className="settings-toggle" type="button" role="switch" aria-checked={enabled} aria-labelledby="settings-email-toggle-label" aria-describedby="settings-email-schedule" disabled={busy} onClick={() => { setEnabled(!enabled); setError(""); setSuccess(""); }}><span /></button>
        </div>
        <p id="settings-email-schedule" className="field-help">Dijadwalkan setiap tanggal 1, pukul 00.00 waktu Jepang (JST). Email dikirim jika ada absensi selesai dalam periode yang dirangkum.</p>
        <div className="settings-email-destination"><Mail aria-hidden="true" /><div><span>Dikirim ke</span><strong>{email}</strong></div></div>
        <p className="field-help">Pengaturan ini berlaku untuk ringkasan pendapatan. Email keamanan akun tetap dikirim saat diperlukan.</p>
        <Feedback id="email-feedback" error={error} success={success} />
        <div className="settings-form-footer"><SaveButton busy={busy} disabled={enabled === saved}>Simpan notifikasi</SaveButton></div>
      </form>
    </section>
  );
}

function PasswordInput({ id, label, value, onChange, current, disabled, invalid }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  current?: boolean; disabled: boolean; invalid: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input id={id} className="form-input" type={show ? "text" : "password"} autoComplete={current ? "current-password" : "new-password"} value={value} required maxLength={128} disabled={disabled} aria-invalid={invalid} aria-describedby="settings-password-help password-feedback" onChange={(event) => onChange(event.target.value)} />
        <button type="button" disabled={disabled} aria-label={`${show ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
      </div>
    </div>
  );
}

function SecuritySection({ hasPassword, hasGoogle, refreshSession }: { hasPassword: boolean; hasGoogle: boolean; refreshSession: () => Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const active = useActive();
  function clearFeedback() { setError(""); setSuccess(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !hasPassword) return;
    setSuccess("");
    const validation = passwordChangeError(current, password, confirmation);
    setError(validation || "");
    if (validation) return;
    setBusy(true);
    try {
      const result = await authClient.changePassword({ currentPassword: current, newPassword: password, revokeOtherSessions: true });
      if (!active.current) return;
      if (result.error) { setError(authErrorMessage(result.error, "Kata sandi belum berubah. Silakan coba lagi.")); return; }
      setCurrent(""); setPassword(""); setConfirmation("");
      setSuccess("Kata sandi berhasil diubah. Sesi di perangkat lain sudah dikeluarkan; kamu tetap masuk di perangkat ini.");
      await refreshSession().catch(() => {
        if (active.current) setSuccess("Kata sandi berhasil diubah. Muat ulang halaman untuk memperbarui sesi akunmu.");
      });
    } catch {
      if (active.current) setError("Kata sandi belum berubah. Periksa koneksi lalu coba lagi.");
    } finally { if (active.current) setBusy(false); }
  }
  return (
    <section className="panel settings-card settings-security" aria-labelledby="settings-security-title">
      <SectionHeading id="settings-security-title" icon={<ShieldCheck />} title="Keamanan akun" description={hasPassword ? "Perbarui kata sandi untuk melindungi akunmu." : "Keamanan mengikuti metode masuk akunmu."} />
      {hasPassword ? (
        <form className="settings-form" onSubmit={save} noValidate>
          <div className="settings-password-fields">
            <PasswordInput id="settings-current-password" label="Kata sandi saat ini" value={current} current disabled={busy} invalid={Boolean(error)} onChange={(value) => { setCurrent(value); clearFeedback(); }} />
            <PasswordInput id="settings-new-password" label="Kata sandi baru" value={password} disabled={busy} invalid={Boolean(error)} onChange={(value) => { setPassword(value); clearFeedback(); }} />
            <PasswordInput id="settings-confirm-password" label="Konfirmasi kata sandi baru" value={confirmation} disabled={busy} invalid={Boolean(error)} onChange={(value) => { setConfirmation(value); clearFeedback(); }} />
          </div>
          <p id="settings-password-help" className="field-help">Gunakan 8–128 karakter dan pilih kata sandi yang berbeda dari sebelumnya. Setelah diubah, sesi di perangkat lain akan dikeluarkan.</p>
          <Feedback id="password-feedback" error={error} success={success} />
          <div className="settings-form-footer settings-security-footer"><Link className="inline-link" href="/forgot-password">Lupa kata sandi?</Link><SaveButton busy={busy} disabled={!current && !password && !confirmation}>Simpan kata sandi</SaveButton></div>
        </form>
      ) : (
        <div className="notice"><ShieldCheck aria-hidden="true" /><p>{hasGoogle ? "Kamu masuk menggunakan Google. Kata sandi dan keamanan akun Google dikelola melalui akun Google-mu." : "Akun ini belum menggunakan kata sandi. Tetap gunakan metode masuk yang terhubung ke akunmu."}</p></div>
      )}
    </section>
  );
}
