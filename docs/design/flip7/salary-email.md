# Email ringkasan pendapatan

Email dijadwalkan tanggal **1 pukul 00.00 JST** dan merangkum periode yang berakhir tanggal **20 bulan sebelumnya**. Contoh: email 1 Oktober 2026 mencakup 21 Agustus–20 September 2026; email 1 Januari 2027 mencakup 21 November–20 Desember 2026. Pemilihan bulan memakai waktu Jepang, termasuk ketika tanggal UTC masih berada pada bulan sebelumnya.

Hanya absensi selesai pada rentang tersebut yang dihitung, termasuk kedua tanggal batas. Judul email, rincian, total, dan tautan ke halaman pendapatan memakai periode yang sama. Tes route menggunakan database SQLite terisolasi dan penyedia email tiruan untuk memeriksa pergantian tahun, Februari biasa/kabisat, batas tengah malam JST, preferensi notifikasi, serta pengecualian draf dan catatan terhapus.

Template cron memakai tema AbsenKuy: teal, gold, cream, latar mint, serta radius 8 px untuk tombol, 12 px untuk kartu ringkasan, dan 16 px untuk panel utama. Wordmark tetap berupa teks agar terbaca tanpa memuat gambar.

Total estimasi pendapatan menjadi informasi utama, diikuti hari dan jam kerja. Rincian harian menampilkan tanggal, masuk/pulang, seluruh interval istirahat, durasi kerja, dan pendapatan. Di ponsel, rincian tersusun vertikal. Tombol membuka halaman pendapatan pada periode email melalui parameter `date`.

Layout menggunakan tabel presentasi dan CSS inline melalui React Email. Media query menambahkan tata letak mobile dan palet dark mode yang mengikuti dukungan aplikasi email penerima; preferensi tema web tidak disinkronkan ke email. Versi teks polos disertakan. Tampilan dasar tetap terbaca saat blok CSS dihapus oleh klien email.

Validasi lokal: render dengan data contoh, 31 hari (sekitar 43 KB HTML), nama panjang, dua istirahat, dan kondisi kosong. Pratinjau browser diperiksa pada lebar 320, 390, 768, dan 1280 px; mode terang/gelap serta fallback tanpa blok CSS tidak menunjukkan overflow atau teks terpotong. Escaping nama dan isi versi teks turut diperiksa. Lint, build, dan 19 tes aplikasi lulus.

Pratinjau tidak mengirim email dan tidak membaca data produksi. Rendering di kotak masuk Gmail, Outlook, atau Apple Mail belum diuji langsung; dark mode dan radius dapat berbeda menurut dukungan klien.
