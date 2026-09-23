# Foto profil

Foto dapat diganti melalui **Menu akun → Pengaturan → Profil → Pilih foto**. Pengguna melihat pratinjau, lalu memilih **Simpan foto** atau **Batalkan**. Penyimpanan foto terpisah dari perubahan nama dan langsung memperbarui avatar di header. Foto Google yang sudah ada tetap ditampilkan sampai pengguna menggantinya.

## Format dan batas

- Maksimal file asli **2 MB (2.097.152 byte)**, diperiksa di browser serta pada aliran request server.
- Mendukung JPEG/JPG, PNG, WebP, GIF, AVIF, HEIC/HEIF, BMP, TIFF, SVG sederhana, dan ICO. Dukungan ditentukan dari isi file yang berhasil didekode, bukan nama ekstensi atau MIME dari browser.
- GIF/format bergerak memakai satu frame; TIFF memakai halaman pertama. SVG dengan skrip atau sumber eksternal ditolak. Format khusus yang tidak bisa didekode mendapat pesan kesalahan, tanpa mengganti foto sebelumnya.
- Varian BMP terkompresi RLE/header OS/2 serta SVGZ/SVG non-UTF-8 belum didukung; gunakan salah satu format umum di atas untuk file tersebut.
- Gambar maksimal 40 megapiksel dan 16.384 piksel per sisi. Gambar dipotong dari tengah ke avatar 256 × 256, orientasi diterapkan bila didukung decoder, dikonversi ke WebP, dan metadata asli tidak disimpan.

## Penyimpanan dan API

Foto WebP disimpan dalam tabel `profile_photos`, satu foto per pengguna. File asli tidak disimpan. Penyimpanan ini menggunakan database Turso yang sudah tersedia; tidak bergantung pada filesystem sementara Vercel atau layanan penyimpanan baru.

- `POST /api/profile-photo`: autentikasi, pemeriksaan origin/ukuran/isi, dan pratinjau WebP. Tidak menulis ke database.
- `PUT /api/profile-photo`: validasi yang sama, pemeriksaan ulang sesi setelah konversi, lalu penyimpanan foto dan URL avatar pada profil dalam satu batch transaksi.
- `GET /api/profile-photo?v=...`: hanya mengembalikan foto milik pengguna yang sedang masuk, dengan versi yang sesuai. Respons `private, no-store`, `nosniff`, dan `same-origin` mencegah penggunaan cache publik atau akses lintas akun.

Foto lama tetap tersimpan jika konversi atau transaksi gagal. Mengganti foto memberi URL versi baru, sehingga avatar baru segera terlihat. Foto berfungsi pada akun email maupun Google karena akses ditentukan oleh sesi aplikasi.

## Deployment

Sebelum merilis kode, jalankan migrasi tambahan pada database tujuan:

```sh
node --env-file=.env.local scripts/migrate-profile-photos.mjs
```

Migrasi dapat dijalankan kembali tanpa menghapus foto. Tidak perlu mengganti environment variable atau membuat project Vercel baru.

Konversi berjalan pada runtime Node.js. `sharp` dipasang langsung pada versi 0.35.4; `libheif-js/wasm-bundle` menangani HEIC tanpa binary sistem tambahan. `libheif-js` dikecualikan dari bundling Next.js agar modul WASM tersemat tetap dapat dimuat.

## Pengujian

- `npm test`: decoder berbagai format serta route dengan SQLite terisolasi, batas ukuran termasuk streaming, autentikasi/origin, isolasi akun, pratinjau tanpa penyimpanan, rollback transaksi, dan pencabutan sesi.
- `node scripts/verify-profile-photo.mjs --local-qa`: API dengan autentikasi nyata pada `localhost:3000` yang **harus** memakai database QA lokal. Membuat akun uji acak dan mengakhiri sesi setelah selesai. Tidak digunakan terhadap database produksi.
- Browser lokal: file di atas 2 MB, file palsu, pratinjau PNG/HEIC, simpan/reload, avatar header, pembatalan, dan perubahan nama yang belum disimpan. Pemeriksaan responsif pada lebar 320, 390, 768, 1024, dan 1280 px, tema terang dan gelap.
