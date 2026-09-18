# Implementasi lokal AbsenKuy — Flip7

Desain acuan: https://stitch.withgoogle.com/projects/12419382858788662715

Implementasi ini menerapkan frame berbahasa Indonesia pada aplikasi Next.js. Tidak ada deployment, commit, atau perubahan konfigurasi `.env.local`.

## Tampilan dan perilaku

- Warna Flip7: teal, coral, gold, permukaan putih, dan input cream. Font sistem tanpa unduhan font eksternal.
- Tema gelap turunan Flip7: latar `#102321`, kartu `#1A302E`, teks hangat `#F6F4E9`, teal `#3CC4BD`, gold `#FFD23F`, coral `#FF8A6A`. Mengikuti sistem pada kunjungan awal; pilihan pengguna disimpan oleh next-themes.
- Desktop memakai sidebar, tablet navigasi atas, ponsel navigasi bawah dengan ruang safe area. Riwayat berubah menjadi kartu di bawah 1200px agar tujuh kolom tabel tidak terlalu padat di laptop kecil.
- Formulir, dialog, validasi, notifikasi, autentikasi, keadaan kosong/error, serta templat email berbahasa Indonesia. Kontrol tanggal/bulan bawaan tetap mengikuti format peramban/perangkat; tanggal dalam teks aplikasi memakai `id-ID`.
- Jam selalu ditampilkan dalam format 24 jam. Masukan `0900` dinormalisasi menjadi `09:00` ketika pengguna meninggalkan kolom.
- Mata uang tetap yen. Angka memakai pemisah ribuan Indonesia, misalnya `¥9.600`.
- Ringkasan muncul sebelum tombol simpan pada ponsel. Tarif hanya disimpan melalui tombol Simpan tarif; catatan yang sudah ada tetap memakai tarif tersimpan.
- Draf dan catatan dihapus tidak dihitung dalam pendapatan. Tahunan mengelompokkan 12 periode gaji tanggal 21–20 agar konsisten dengan bulanan; kalender dapat digeser tanpa mengganti periode.
- Riwayat memperlihatkan aktivitas terakhir tiap catatan sesuai skema yang ada, bukan arsip lengkap semua versi perubahan.
- Ubah/hapus absensi dan pengaturan hari libur terhubung ke server. Validasi serta perhitungan nominal dilakukan lagi di server; identitas pengguna berasal dari sesi. Fungsi reset langsung tanpa verifikasi yang tidak dipakai UI dihapus; pemulihan tetap menggunakan Better Auth.

## Validasi

- `npm run build`: lulus.
- `npm run lint`: lulus.
- `npm test`: 10 pengujian lulus (perhitungan istirahat, input belum lengkap, draf, tanggal valid, kalender, batas periode gaji, pengecualian catatan dihapus, dan tarif tersimpan).
- Pengujian browser Chrome dengan database SQLite QA terpisah: masuk akun uji, simpan absensi, ubah jam, tolak jam terbalik, simpan tarif, tarif catatan lama tetap, simpan draf, normalisasi waktu, ubah hari libur, hapus catatan, dan filter riwayat.
- Inspeksi responsif pada lebar 320, 390, 835, 1024, 1280, dan 1920px. Tidak ditemukan overflow horizontal pada halaman yang diperiksa. Dialog dapat digulir pada ponsel; fokus keyboard dikelola Base UI.
- Tema gelap tetap aktif setelah reload. Validasi email dan halaman reset tanpa token telah diperiksa.
- Pengiriman email sungguhan, Google OAuth, dan penggantian kata sandi akun sungguhan tidak dijalankan. Tidak ada data produksi yang diubah dalam pengujian.

## Pratinjau saat pengujian

Server lokal `http://localhost:3000` memakai database QA di `.local-qa/flip7.db`, bukan database dari `.env.local`. Folder `.local-qa/` diabaikan Git. Kunci email/OAuth dikosongkan hanya pada proses QA. Menjalankan `npm run dev` dari terminal baru menggunakan konfigurasi `.env.local` proyek seperti semula.

Audit lanjutan radius, komponen, dan responsivitas: [responsive-audit.md](./responsive-audit.md).
