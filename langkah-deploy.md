# Langkah Deploy Aplikasi Absensi ke Vercel dengan Turso Database

Panduan ini diasumsikan untuk aplikasi **Next.js App Router + TypeScript + Better Auth + Drizzle ORM + Turso/libSQL** yang sudah selesai dibuat secara frontend, backend, dan integrasinya.

Tujuan deploy:
- Hosting aplikasi di **Vercel Hobby/free tier**.
- Database production memakai **Turso/libSQL**, bukan SQLite file lokal.
- Semua konfigurasi production memakai environment variables.

---

## 0. Checklist sebelum deploy

Pastikan hal berikut sudah siap:

- [ ] Project sudah berjalan lokal dengan `npm run dev`.
- [ ] Build lokal berhasil dengan `npm run build`.
- [ ] Schema Drizzle sudah siap.
- [ ] Better Auth sudah berjalan lokal.
- [ ] Halaman login/register/logout sudah berjalan.
- [ ] Semua halaman protected sudah mengecek session.
- [ ] File `.env.local` tidak ikut di-commit ke GitHub.
- [ ] Project sudah memakai Turso/libSQL untuk database production.
- [ ] Tidak memakai SQLite file lokal sebagai database production di Vercel.

---

## 1. Pastikan dependency database sudah sesuai

Untuk Turso + Drizzle, aplikasi biasanya membutuhkan package berikut:

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

Drizzle mendukung Turso/libSQL melalui driver `@libsql/client`.[1]

Jika project sudah punya dependency tersebut, tidak perlu install ulang.

---

## 2. Pastikan koneksi database membaca environment variables

Contoh file koneksi database:

```ts
// src/db/index.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

Pastikan nama variable sama dengan yang akan dipakai di Vercel:

```env
DATABASE_URL=
DATABASE_AUTH_TOKEN=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Catatan penting:
- Jangan hardcode URL database atau token di source code.
- Jangan pakai file SQLite lokal untuk production di Vercel.
- Untuk production, `DATABASE_URL` harus mengarah ke database Turso remote.

---

## 3. Buat database Turso production

Login atau signup Turso melalui CLI:

```bash
turso auth signup
```

Jika sudah punya akun:

```bash
turso auth login
```

Dokumentasi Turso/Drizzle juga menggunakan alur signup atau login melalui CLI sebelum membuat database.[3]

Buat database baru, contoh:

```bash
turso db create absensi-kerja
```

Dokumentasi Drizzle + Turso menggunakan perintah `turso db create` untuk membuat database baru.[3]

Cek URL database:

```bash
turso db show absensi-kerja
```

Biasanya URL terlihat seperti:

```txt
libsql://absensi-kerja-nama-akun.turso.io
```

Buat auth token database:

```bash
turso db tokens create absensi-kerja
```

Simpan hasilnya baik-baik karena token ini akan dimasukkan ke `.env.local` dan Vercel Environment Variables.

---

## 4. Isi `.env.local` untuk test production database dari lokal

Buat atau update file `.env.local`:

```env
DATABASE_URL="libsql://absensi-kerja-nama-akun.turso.io"
DATABASE_AUTH_TOKEN="token-dari-turso"

BETTER_AUTH_SECRET="isi-dengan-random-secret-yang-panjang"
BETTER_AUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="google-client-id"
GOOGLE_CLIENT_SECRET="google-client-secret"
```

Untuk membuat `BETTER_AUTH_SECRET`, bisa gunakan:

```bash
openssl rand -base64 32
```

Atau jika memakai Node.js:

```bash
node -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

---

## 5. Jalankan migration/schema ke Turso

Pilih sesuai konfigurasi project kamu.

### Opsi A — jika project memakai Drizzle migration

Generate migration:

```bash
npm run db:generate
```

Jalankan migration:

```bash
npm run db:migrate
```

Contoh script di `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Opsi B — jika project memakai Drizzle push untuk tahap awal

```bash
npm run db:push
```

Contoh script:

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

Untuk project pribadi tahap awal, `drizzle-kit push` sering lebih sederhana. Untuk project yang sudah stabil, migration lebih aman karena perubahan schema bisa dilacak.

---

## 6. Test aplikasi lokal memakai Turso remote

Jalankan:

```bash
npm run dev
```

Lalu test:

- [ ] Register email/password.
- [ ] Login email/password.
- [ ] Login Google jika sudah dikonfigurasi.
- [ ] Buat absensi hari ini.
- [ ] Simpan draft absensi.
- [ ] Isi clock out sampai status completed.
- [ ] Cek halaman history.
- [ ] Cek halaman payroll.
- [ ] Cek halaman yearly.
- [ ] Cek settings gaji.

Jika data tersimpan dan muncul lagi setelah refresh, berarti koneksi Turso sudah benar.

---

## 7. Setup Google OAuth untuk lokal dan production

Di Google Cloud Console, siapkan OAuth Client untuk aplikasi web.

Tambahkan authorized redirect URI untuk lokal:

```txt
http://localhost:3000/api/auth/callback/google
```

Setelah nanti mendapat domain Vercel, tambahkan juga redirect URI production:

```txt
https://nama-project.vercel.app/api/auth/callback/google
```

Jika kamu memakai custom domain:

```txt
https://domain-kamu.com/api/auth/callback/google
```

Catatan:
- Pastikan path callback sesuai konfigurasi Better Auth di project kamu.
- Jika route auth kamu berbeda, sesuaikan URL callback-nya.

---

## 8. Push project ke GitHub

Pastikan `.env.local` tidak ikut ter-commit.

Cek `.gitignore`:

```gitignore
.env
.env.local
.env.production
.env*.local
```

Commit dan push:

```bash
git add .
git commit -m "Prepare app for Vercel deployment"
git branch -M main
git remote add origin https://github.com/username/nama-repo.git
git push -u origin main
```

Jika repository sudah ada, cukup:

```bash
git add .
git commit -m "Prepare deployment"
git push
```

---

## 9. Deploy ke Vercel

Langkah di dashboard Vercel:

1. Buka Vercel.
2. Klik **Add New Project**.
3. Import repository GitHub project kamu.
4. Framework preset biasanya otomatis terdeteksi sebagai **Next.js**.
5. Isi Environment Variables sebelum deploy.

Vercel Environment Variables adalah key-value yang dikonfigurasi di luar source code dan nilainya bisa berbeda per environment.[8]

Tambahkan variable berikut di Vercel:

```env
DATABASE_URL=libsql://absensi-kerja-nama-akun.turso.io
DATABASE_AUTH_TOKEN=token-dari-turso
BETTER_AUTH_SECRET=random-secret-production
BETTER_AUTH_URL=https://nama-project.vercel.app
GOOGLE_CLIENT_ID=google-client-id
GOOGLE_CLIENT_SECRET=google-client-secret
```

Pilih environment:

- Production
- Preview
- Development jika diperlukan

Vercel menyediakan pengelolaan Environment Variables melalui dashboard atau CLI.[7]

Klik **Deploy**.

---

## 10. Setelah deploy pertama selesai

Setelah deploy sukses, Vercel akan memberikan URL seperti:

```txt
https://nama-project.vercel.app
```

Lakukan hal berikut:

1. Salin URL Vercel.
2. Pastikan `BETTER_AUTH_URL` di Vercel sama persis dengan URL tersebut:

```env
BETTER_AUTH_URL=https://nama-project.vercel.app
```

3. Tambahkan redirect URI production di Google OAuth:

```txt
https://nama-project.vercel.app/api/auth/callback/google
```

4. Redeploy project dari Vercel jika environment variable berubah.

---

## 11. Test aplikasi di production

Buka URL Vercel dan test semua flow:

- [ ] Halaman register terbuka.
- [ ] Register email/password berhasil.
- [ ] Login email/password berhasil.
- [ ] Login Google berhasil.
- [ ] Logout berhasil.
- [ ] Halaman absensi tidak bisa diakses tanpa login.
- [ ] Absensi hari ini bisa disimpan.
- [ ] Validasi jam kerja berjalan.
- [ ] Perhitungan jam kerja real time berjalan.
- [ ] Perhitungan gaji real time berjalan.
- [ ] Data history muncul.
- [ ] Data payroll periode 21–20 muncul.
- [ ] Selector periode gaji sebelumnya berjalan.
- [ ] Akumulasi yearly berjalan.
- [ ] Settings gaji berjalan.

---

## 12. Jika migration perlu dijalankan lagi setelah deploy

Jika kamu mengubah schema database setelah aplikasi production berjalan:

1. Update schema Drizzle.
2. Generate migration:

```bash
npm run db:generate
```

3. Jalankan migration ke Turso production dari lokal:

```bash
npm run db:migrate
```

4. Commit perubahan migration:

```bash
git add .
git commit -m "Update database schema"
git push
```

5. Vercel akan redeploy otomatis jika repository terhubung.

Catatan:
- Jangan hapus kolom production sembarangan jika sudah ada data.
- Backup/export data dulu jika perubahan schema besar.

---

## 13. Contoh `drizzle.config.ts`

Contoh konfigurasi sederhana:

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
  },
});
```

Jika versi Drizzle yang kamu pakai memakai format config berbeda, sesuaikan dengan dokumentasi versi tersebut.

---

## 14. Troubleshooting umum

### Error: `DATABASE_URL is not defined`

Penyebab:
- Environment variable belum diisi di Vercel.
- Nama variable di kode berbeda dengan nama di Vercel.

Solusi:
- Cek nama variable di `src/db/index.ts`.
- Cek Vercel Project Settings → Environment Variables.
- Redeploy setelah mengubah environment variables.

---

### Google login error redirect URI mismatch

Penyebab:
- Redirect URI di Google Cloud Console belum sama dengan URL production.

Solusi:
- Tambahkan:

```txt
https://nama-project.vercel.app/api/auth/callback/google
```

- Pastikan sesuai route auth di project.
- Redeploy jika perlu.

---

### Login berhasil lokal tapi gagal di Vercel

Cek:

- `BETTER_AUTH_URL` sudah memakai URL Vercel production.
- `BETTER_AUTH_SECRET` sudah ada di Vercel.
- Auth tables Better Auth sudah dibuat di database Turso.
- Cookie/session config sesuai HTTPS production.

---

### Data tidak tersimpan di production

Cek:

- `DATABASE_URL` mengarah ke Turso remote.
- `DATABASE_AUTH_TOKEN` valid.
- Migration sudah dijalankan ke database Turso.
- Tabel `attendance_records`, auth tables, dan `salary_settings` sudah ada.

---

### Build gagal di Vercel

Jalankan lokal dulu:

```bash
npm run build
```

Perbaiki error TypeScript, import path, atau environment variable yang dipanggil saat build.

Jika ada kode yang memakai `window`, `localStorage`, atau API browser di Server Component, pindahkan ke Client Component dengan:

```tsx
"use client";
```

---

## 15. Rekomendasi final agar tetap gratis dan aman

- Gunakan Vercel untuk hosting Next.js.
- Gunakan Turso/libSQL untuk database production.
- Jangan gunakan SQLite file lokal untuk production di Vercel.
- Jangan simpan secret di source code.
- Jangan commit `.env.local`.
- Jalankan migration dari lokal ke Turso production.
- Setelah mengubah environment variables di Vercel, lakukan redeploy.
- Untuk project pribadi/internal, hindari fitur tambahan seperti background worker, cron, queue, atau email notification agar tetap sederhana dan gratis.

---

## Ringkasan command utama

```bash
# Login/signup Turso
turso auth signup
# atau
turso auth login

# Buat database Turso
turso db create absensi-kerja

# Lihat info database
turso db show absensi-kerja

# Buat token
turso db tokens create absensi-kerja

# Install dependency jika belum ada
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit

# Generate dan migrate database
npm run db:generate
npm run db:migrate

# Test lokal
npm run dev
npm run build

# Push ke GitHub
git add .
git commit -m "Deploy to Vercel with Turso"
git push
```

Setelah itu import repository ke Vercel, isi environment variables, deploy, lalu test aplikasi production.