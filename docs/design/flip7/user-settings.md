# Pengaturan akun

Halaman `/settings` tersedia melalui **Menu akun → Pengaturan**. Navigasi utama tetap berisi Absensi, Riwayat, dan Pendapatan.

- **Profil:** nama lengkap (1–80 karakter setelah trim), email hanya baca, dan metode masuk yang terhubung.
- **Pengaturan kerja:** tarif default ¥1–¥1.000.000 per jam, tanpa desimal. Catatan dan draf yang sudah tersimpan mempertahankan tarif masing-masing.
- **Tampilan:** terang, gelap, atau mengikuti sistem. Preferensi tersimpan per browser dan tetap sinkron dengan tombol tema di header.
- **Notifikasi:** pilihan menerima ringkasan pendapatan bulanan, tersimpan per akun. Akun tanpa preferensi tetap menerima email seperti sebelumnya. Pilihan ini tidak memengaruhi email keamanan.
- **Keamanan:** perubahan kata sandi untuk akun dengan kredensial email. Akun Google tanpa kata sandi menampilkan penjelasan pengelolaan keamanan melalui Google. Sesi perangkat lain langsung dicabut setelah kata sandi berubah.

Setiap form memiliki status simpan dan pesan kesalahan sendiri. Menyimpan profil tidak menghapus perubahan yang belum disimpan pada bagian lain. Komponen menggunakan token warna dan bentuk Flip7 yang sudah dipakai aplikasi, dengan satu kolom di ponsel/tablet kecil dan dua kolom di desktop.

## Deployment database

Jalankan migrasi tambahan ini **sebelum** merilis kode ke database tujuan:

```sh
node --env-file=.env.local scripts/migrate-user-preferences.mjs
```

Pastikan `DATABASE_URL` dan `DATABASE_AUTH_TOKEN` menunjuk ke lingkungan tujuan. Migrasi hanya membuat tabel `user_preferences` jika belum ada, aman dijalankan kembali, dan mempertahankan preferensi yang tersimpan. Kode lama tetap kompatibel dengan tabel tambahan ini.

## Verifikasi

- `npm run lint`, `npm test`, dan `npm run build`.
- Tes backend memakai SQLite terisolasi: validasi, isolasi akun, nilai default, migrasi berulang, pengecualian penerima cron, pemeriksaan ulang preferensi sebelum kirim, serta kegagalan penyedia email.
- `node scripts/verify-settings-auth.mjs --local-qa` hanya untuk server `localhost:3000` yang sudah dikonfigurasi memakai database QA lokal. Script membuat akun uji acak, menguji profil dan kata sandi, lalu mengakhiri sesi uji. Jangan arahkan server tersebut ke database produksi.
- Pemeriksaan browser lokal: simpan dan muat ulang profil/tarif/notifikasi, validasi nama dan tarif, tema terang/gelap/sistem, sinkronisasi tombol tema, menu akun, tarif catatan lama, dan pengalihan ke login setelah keluar.
- Lebar layar 320, 390, 768, 1024, 1280, dan 1920 px tanpa overflow horizontal. Pengujian tidak mengirim email sungguhan atau mengubah akun produksi.
