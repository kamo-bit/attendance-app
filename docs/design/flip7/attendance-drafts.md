# Perlindungan input absensi

## Perilaku

- Form Absensi serta dialog edit dari Absensi, Riwayat, dan Pendapatan mencadangkan perubahan secara otomatis ke localStorage. Penulisan dilakukan langsung saat input berubah, termasuk input parsial dan istirahat belum lengkap; tidak menunggu debounce yang berisiko kehilangan ketikan terakhir saat tab ditutup.
- Nilai awal yang disalin dari jadwal sebelumnya tidak membuat draf sampai pengguna benar-benar mengubahnya.
- Cadangan adalah **draf lokal di browser/perangkat yang sama**, dipisahkan berdasarkan ID akun dan ID catatan atau tanggal baru. Ini tidak membuat/mengubah catatan database, tidak muncul sebagai absensi baru di kalender, dan tidak masuk total pendapatan. Simpan draf menyimpan ke akun; Simpan absensi menyelesaikan catatan seperti sebelumnya. Data lokal hilang jika data situs dihapus dan tidak disinkronkan antarperangkat.
- Indikator membedakan autosave aktif, draf tersimpan di perangkat, menyimpan ke akun, dan kegagalan penyimpanan browser. Draf dipulihkan saat pengguna kembali ke tanggal atau membuka kembali dialog edit catatan. URL Absensi mempertahankan tanggal yang sedang diisi.
- Tombol Tutup pada dialog edit mempertahankan draf. Buang draf lokal meminta konfirmasi di dalam form, mengembalikan nilai awal, dan tidak mengubah catatan akun. Cadangan dibersihkan setelah server mengonfirmasi penyimpanan.
- Revisi catatan dan nilai awal diperiksa sebelum pemulihan. Jika catatan akun berubah, form menampilkan catatan terbaru dan meminta pilihan Pulihkan draf atau Buang draf lokal; penyimpanan dinonaktifkan sampai pengguna memilih. Draf untuk tanggal baru tetap ditemukan jika catatan akun pada tanggal itu kemudian dibuat.
- Jika localStorage diblokir/penuh, input tetap ditahan di memori selama tab hidup, termasuk saat berpindah halaman. Status tidak mengklaim penyimpanan berhasil. Tombol coba lagi dapat memulihkan penyimpanan lokal. Peringatan native sebelum unload dipasang selama ada cadangan yang hanya berada di memori; browser dapat membatasi peringatan ini, khususnya saat aplikasi dihentikan paksa.
- Data workspace menunggu kecocokan pemilik dengan sesi agar data akun sebelumnya tidak dipakai sebagai sumber formulir ketika akun berganti.

## Validasi

- Tujuh tes baru: input parsial/dua istirahat; pemisahan akun/tanggal/catatan; kegagalan storage dan retry; payload rusak; pemulihan terhadap revisi baru; pembuangan terarah; pembersihan setelah simpan akun. Total 63 tes lulus, beserta lint dan build produksi.
- Browser dengan database QA lokal: reload; tutup/buka tab; navigasi ke Riwayat dan kembali; draf edit dipulihkan dari halaman berbeda; konfirmasi buang; simpan draf dan selesaikan absensi; catatan selesai tidak berubah sebelum penyimpanan eksplisit; catatan akun diperbarui ketika draf masih ada; tanggal baru mendapat catatan akun sebelum pemulihan; input melalui popup jam mobile.
- Pemeriksaan tema terang/gelap pada viewport 320×740, 390×844, 768×1024, dan 1280×800. Tidak ada overflow horizontal; bilah simpan mobile tetap satu dan dialog edit dapat digulir. Pengujian menggunakan viewport browser, bukan perangkat fisik.
- Kegagalan storage diuji melalui penyimpanan simulasi pada tes otomatis. Tidak ada data produksi atau email nyata yang dipakai untuk pengujian.
