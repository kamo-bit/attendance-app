export type UserSettings = {
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  providers: string[];
  hasPassword: boolean;
  wage: number;
  salaryEmailEnabled: boolean;
};

export function profileNameError(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return "Nama wajib diisi.";
  if (name.trim().length > 80) return "Nama maksimal 80 karakter.";
  return null;
}

export function passwordChangeError(
  current: unknown,
  next: unknown,
  confirmation: unknown,
): string | null {
  if (typeof current !== "string" || !current)
    return "Isi kata sandi saat ini.";
  if (current.length > 128) return "Kata sandi saat ini maksimal 128 karakter.";
  if (typeof next !== "string" || next.length < 8)
    return "Kata sandi baru minimal 8 karakter.";
  if (next.length > 128) return "Kata sandi baru maksimal 128 karakter.";
  if (next === current) return "Kata sandi baru harus berbeda dari kata sandi saat ini.";
  if (next !== confirmation) return "Konfirmasi kata sandi baru belum cocok.";
  return null;
}

export function salaryEmailPreferenceError(enabled: unknown): string | null {
  return typeof enabled === "boolean" ? null : "Pilihan notifikasi email tidak valid.";
}
