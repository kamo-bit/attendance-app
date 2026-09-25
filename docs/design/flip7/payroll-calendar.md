# Kalender dan periode gaji

## Perilaku

- Pendapatan bulanan menampilkan rentang tanggal kerja sebagai judul utama kartu periode, misalnya **21 Sep – 20 Okt 2026**, dengan label periode gaji Oktober 2026. Rentang lintas tahun mencantumkan kedua tahun.
- Navigasi periode (sebelumnya/berikutnya/pemilih bulan) mengubah ringkasan dan mengarahkan kalender ke tanggal dalam periode. Pilihan tanggal yang masih sesuai dipertahankan; jika tidak, gunakan hari ini bila termasuk periode, atau tanggal penutupan.
- Kalender memiliki pintasan ke dua bulan pembentuk periode, dengan batas tanggal yang relevan. Navigasi bulan kalender hanya mengganti tampilan kalender; ringkasan gaji tetap pada periode terpilih.
- Bulan di luar periode menampilkan penjelasan dan tombol Kembali ke periode. Detail tanggal di luar periode menyebut rentang yang benar dan menyediakan Tampilkan periode ini.
- Di bawah lebar 768 piksel, ketukan tanggal membuka panel dari bawah. Tablet dan desktop menggunakan panel detail di samping kalender. Tautan `?date=` yang valid langsung membuka detail pada ponsel.
- Detail, edit, pemilih jam, dan konfirmasi hapus menggunakan dialog bertingkat. Fokus kembali ke judul detail setelah edit/hapus, lalu ke tombol tanggal setelah panel ditutup. Perubahan ke ukuran desktop menutup panel ponsel.
- Setelah edit mengganti tanggal kerja, periode, bulan kalender, tanggal pilihan, tahun ringkasan, dan tautan tanggal mengikuti catatan yang disimpan. Memuat ulang tidak kembali ke tanggal lama.
- Draf dan catatan terhapus tetap dikecualikan dari pendapatan. Tarif asli serta perhitungan gaji tidak berubah. Tidak ada migrasi database.

## Verifikasi lokal — 26 September 2026

- Tes domain: batas tanggal 20/21, perpindahan tahun, label rentang, panjang Februari/tahun kabisat, pilihan tanggal saat berpindah periode, input bulan tidak valid, dan penyaringan perhitungan di kedua batas periode.
- Browser: kalender September/Oktober digeser ke November tanpa mengubah ringkasan 21 Sep–20 Okt; kembali ke periode; memilih tanggal luar periode; pindah ke periode tanggal tersebut; pintasan kedua bulan; navigasi periode dan tampilan tahunan.
- Lebar 320, 390, 768, 1280 piksel; tema terang dan gelap; detail kosong, selesai, draf, hari libur, serta editor hari libur. Panel menempel di bawah dan tidak menimbulkan overflow horizontal.
- Edit dari panel ponsel, buka/tutup pemilih jam, simpan, hapus, dan kembalikan fokus. Tautan langsung ke draf membuka panel yang sesuai; mengubah ukuran ke tablet menutup panel dan menampilkan detail inline.
- Catatan QA baru tanggal 20 Desember dipindahkan ke 21 Desember: rentang menjadi 21 Des 2026–20 Jan 2027, tahun ringkasan 2027, estimasi tetap ¥11.050. Tautan diperbarui dan detail tetap benar setelah reload. Catatan tambahan tersebut kemudian dihapus melalui UI lokal.
- Pengujian menggunakan akun dan database QA lokal, tanpa perubahan catatan produksi atau pengiriman email.
