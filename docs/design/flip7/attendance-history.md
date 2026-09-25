# Riwayat absensi: filter dan pemulihan

## Perilaku

- Filter utama: Semua, Draf, Selesai, Dihapus. Data berasal dari catatan yang telah disimpan ke akun; cadangan lokal form tetap mengikuti mekanisme autosave.
- Urutan awal berdasarkan tanggal kerja terbaru. Pilihan lain: tanggal kerja terlama dan pembaruan terbaru. Pembaruan serta ID menjadi pembanding tambahan agar urutan konsisten.
- Filter lanjutan dapat dibuka untuk memilih bulan, rentang tanggal inklusif, dan aktivitas terakhir (Dibuat/Diubah). Memilih bulan mengosongkan rentang; mengisi rentang mengosongkan bulan. Batas awal atau akhir boleh kosong.
- Rentang terbalik menampilkan validasi. Mengubah filter atau urutan kembali ke halaman pertama. Reset mengembalikan fokus ke judul halaman.
- Filter Dihapus mengosongkan dan menonaktifkan filter aktivitas. Catatan terhapus menyediakan tombol Pulihkan pada tabel maupun kartu.

## Pemulihan

Pemulihan meminta konfirmasi dan selalu mengembalikan catatan sebagai **draf**. Skema lama tidak menyimpan status sebelum penghapusan, sehingga jam pulang yang terisi tidak boleh dianggap sebagai bukti bahwa catatan dahulu sudah selesai. Jam kerja, kedua istirahat, tanggal, ID, waktu pembuatan, dan tarif lama dipertahankan. Jam bersih dan estimasi tersimpan direset ke nol sampai pengguna menyelesaikan absensi melalui Ubah catatan.

Server membaca sesi baru, membatasi operasi pada catatan terhapus milik pengguna, dan menolak pemulihan apabila ada catatan aktif pada tanggal yang sama. Catatan pengguna lain atau catatan lain yang masih terhapus tidak menghalangi pemulihan. Pemeriksaan dan pembaruan menggunakan transaksi tulis libSQL; pembuatan dan pengubahan absensi juga memakai transaksi agar pemeriksaan tanggal tidak bersaing dengan pemulihan. Tidak memerlukan migrasi skema.

Setelah berhasil, Riwayat menampilkan filter Draf, aktivitas Semua, halaman pertama, dengan bulan/rentang dan urutan tetap dipertahankan. Pesan kegagalan membedakan kegagalan penyimpanan dari kegagalan penyegaran tampilan setelah data tersimpan.

## Verifikasi lokal — 26 September 2026

- Pengujian otomatis menggunakan SQLite terisolasi: kombinasi filter, batas tanggal, urutan stabil, autentikasi/kepemilikan, benturan draf/selesai, pemulihan ulang, rollback, dua pemulihan bersamaan, dan regresi simpan/ubah absensi serta tarif.
- Browser dengan akun uji lokal: pagination, status+aktivitas, rentang 17–19 September, rentang terbalik, reset, bulan, dan ketiga urutan.
- Pemulihan 19 September ditolak karena memiliki draf aktif. Catatan 15 September berhasil dipulihkan sebagai draf lalu diselesaikan: 09:00–18:00, istirahat 12:00–13:00, tarif ¥1.200, hasil 8 jam / ¥9.600.
- Lebar 320, 390, 768, dan 1280 piksel diperiksa; tema terang dan gelap, kartu/tabel, filter lanjutan, serta dialog pemulihan. Tidak ditemukan overflow horizontal atau galat konsol browser.
- Pengujian hanya mengubah database QA lokal; tidak mengubah catatan pengguna produksi atau mengirim email.
