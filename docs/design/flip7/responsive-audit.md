# Audit konsistensi dan responsivitas — 19 September 2026

Implementasi lokal berdasarkan desain Flip7 berbahasa Indonesia. Audit ini memperbaiki bentuk komponen dan tata letak tanpa mengubah aturan absensi atau perhitungan pendapatan.

## Perbaikan

- Radius sebelumnya tersebar sebagai 7, 9, 10, 11, 14, 20, dan 28 px. Panel juga berubah radius pada breakpoint ponsel. Semuanya sekarang menggunakan token yang sama pada tema terang, tema gelap, dan setiap ukuran layar.
- Tabel riwayat beralih ke kartu di bawah 1200 px agar kolom tanggal, jam, dan istirahat tidak terlalu padat di samping sidebar. Padding panel tidak lagi menimpa padding khusus tabel. Header dan footer kartu dapat membungkus ketika ruangnya sempit.
- Angka durasi mempertahankan pasangan angka dan satuan dalam satu baris, misalnya `15 jam` dan `45 menit`. Ukuran angka disesuaikan pada lebar di bawah 360 px agar tidak melewati batas kartu.
- Input menggunakan ukuran teks 16 px; kolom jam utama tetap lebih besar sesuai hierarki. Tombol segmen memiliki tinggi minimum 44 px, tautan aksi ikon memiliki area minimum 44 × 44 px, dan tombol tutup dialog berbentuk lingkaran seperti kontrol ikon lainnya.
- Tombol aksi dialog membagi ruang yang tersedia dan ditumpuk dengan lebar penuh saat ruang ponsel terlalu sempit. Dialog tetap memiliki batas tinggi dan dapat digulir pada layar pendek. Pesan panjang dapat membungkus, termasuk alamat email tanpa spasi.
- Notifikasi memakai token radius kartu yang sama; radius logo, kalender, panel autentikasi, grafik, dan komponen kecil juga diselaraskan.

## Token bentuk

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `--shape-small` | 4 px | Label kecil, penanda legenda |
| `--shape-control` | 8 px | Input, kalender, ikon kotak, pesan informasi |
| `--shape-card` | 12 px | Kartu bagian dalam, istirahat, ringkasan, notifikasi, logo kecil |
| `--shape-panel` | 16 px | Panel utama, dialog, panel autentikasi |
| `--shape-pill` | 999 px | Tombol, segmen, badge, navigasi horizontal |
| `--shape-circle` | 50% | Avatar, tombol ikon, elemen bulat |

Skala Tailwind `rounded-sm/md/lg/xl` terhubung ke token tersebut. Panel utama, input, logo, dan tanggal kalender mempertahankan radius pada setiap breakpoint; tema tidak mengubah skala ini.

## Cakupan pemeriksaan browser

Browser: Chrome melalui viewport emulation, menggunakan akun dan database QA lokal terpisah.

| Kelompok | Ukuran viewport (lebar × tinggi) |
| --- | --- |
| Ponsel | 320 × 740, 360 × 780, 390 × 844, 430 × 932 |
| Tablet | 768 × 1024, 835 × 1110 |
| Laptop dan desktop | 1024 × 768, 1280 × 800, 1920 × 1080 |
| Lanskap pendek | 844 × 390 |

Setiap ukuran diperiksa dalam tema terang dan gelap untuk:

- Absensi, riwayat, pendapatan bulanan, dan pendapatan tahunan.
- Masuk, daftar, lupa kata sandi, reset dengan parameter token uji, serta reset tanpa token.
- Halaman 404.
- Dialog pengaturan hari libur, edit absensi dengan dua istirahat, konfirmasi hapus, konfirmasi keluar, dan konfirmasi mencatat pada hari libur.

Pemeriksaan mencakup lebar dokumen, overflow isi komponen, radius hasil CSS, ukuran tombol, serta inspeksi screenshot representatif untuk ponsel, tablet, desktop, dan dialog. Dialog juga dibuka/ditutup dan dioperasikan melalui keyboard. Pada lanskap pendek, batas dialog diverifikasi kembali setelah ukuran viewport stabil.

Catatan QA dengan dua waktu istirahat digunakan untuk menguji kartu ponsel dan tabel desktop. Isi istirahat kemudian dikembalikan. Konfirmasi hari libur, hapus, dan keluar dibatalkan; tidak ada catatan baru yang dibuat dari pengujian konfirmasi tersebut.

Hasil akhir: tidak ditemukan overflow horizontal atau penyimpangan radius pada tampilan yang diperiksa. Build produksi dan lint lulus; 10 pengujian domain yang sudah tersedia juga lulus.

## Batas validasi

Ini merupakan pengujian ukuran layar di Chrome, bukan pengujian langsung setiap perangkat fisik atau semua mesin browser. Native date/month picker tetap mengikuti sistem dan browser. Pengiriman email, Google OAuth, serta perubahan kata sandi sungguhan tidak dijalankan. Tidak ada deployment maupun perubahan data produksi.
