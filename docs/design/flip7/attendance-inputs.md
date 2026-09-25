# Nilai awal absensi dan pemilih jam

## Nilai awal

- Tanggal yang sudah memiliki catatan aktif selalu memakai catatan tersebut, termasuk draf yang jam pulangnya belum terisi.
- Untuk tanggal baru, jam masuk, jam pulang, status/jumlah istirahat, dan satu atau dua rentang istirahat disalin dari catatan **selesai terdekat sebelum tanggal yang dipilih**. Urutan memakai tanggal kerja, bukan waktu pembaruan catatan.
- Draf, catatan dihapus, dan tanggal setelah tanggal yang dipilih tidak menjadi sumber nilai awal. Bila belum ada sumber, formulir kosong.
- Tanggal tetap mengikuti pilihan pengguna. Tarif memakai pengaturan saat ini; ID, nominal, tarif lama, status selesai, dan periode gaji sumber tidak disalin.
- Pengisian awal tidak membuat catatan di database. Pengguna dapat mengubah nilainya sebelum menekan Simpan absensi atau Simpan draf. Formulir menampilkan tanggal sumber.

## Pemilih jam

- Ponsel (lebar di bawah 768 px) dan perangkat dengan pointer utama sentuh membuka popup ketika kolom jam diketuk. Desktop tetap mendukung mengetik langsung dan memiliki tombol jam untuk membuka popup yang sama.
- Jam dinding mendukung ketuk maupun geser jarum. Pemilihan jam otomatis dilanjutkan ke menit setelah jarum dilepas. Menit memiliki ketelitian satu menit.
- Format 24 jam dengan rentang `00–11` / `12–23`; jam dan menit juga bisa dipilih melalui tombol angka digital.
- Pilihan sementara baru diterapkan ke formulir melalui Gunakan waktu. Batal, Escape, dan tombol tutup membuang pilihan sementara. Kosongkan mengosongkan kolom, misalnya jam pulang untuk draf.
- Mode Ketik waktu menerima format `09:30`, `9:30`, atau `0930`, serta menolak waktu di luar `00:00–23:59` dan input ambigu seperti `12:9`.
- Keyboard: tombol panah menaikkan/menurunkan satu unit, Page Up/Down lima unit, Home/End ke batas awal/akhir, Enter/Spasi berpindah antara jam dan menit. Fokus kembali ke pemicu ketika popup ditutup.
- Pemilih bekerja pada jam masuk, pulang, semua waktu istirahat, dan di dalam dialog edit. Dialog induk meredup ketika pemilih terbuka.
- Token warna dan radius Flip7 dipakai pada kedua tema. Layar lanskap pendek menampilkan pengaturan dan jam dinding berdampingan.

## Formulir mobile yang ringkas

- Pada lebar di bawah 768 px, Simpan absensi dan Simpan draf berada pada satu bilah tetap di atas navigasi bawah. Pada tablet/desktop, tombol tetap menjadi bagian dari Ringkasan harian. Hanya ada satu set tombol di DOM.
- Tinggi bilah dan navigasi diukur dengan ResizeObserver. Ruang di bagian bawah halaman mengikuti tinggi aktual, termasuk pesan kesalahan yang membungkus dan safe area navigasi. Ringkasan terakhir tetap dapat digulir hingga terlihat seluruhnya. Dialog jam dan konfirmasi hari libur tampil di atas bilah.
- Pesan validasi tampil di dalam bilah dekat tombol. Tombol dinonaktifkan selama penyimpanan, dan bilah hilang ketika catatan selesai.
- Petunjuk dan jarak antarbagian diringkas. Tarif ditampilkan sebagai informasi; tautan Ubah tarif default di Pengaturan membuka langsung bagian Pengaturan kerja setelah data akun selesai dimuat. Catatan/draf yang sudah tersimpan tetap memakai tarif aslinya.
- QA dengan database lokal: validasi jam pulang kosong, simpan draf dan muat ulang, selesaikan absensi dan muat ulang, pembatalan konfirmasi hari libur, popup jam, tautan pengaturan tarif, serta tema terang/gelap. Layout diperiksa pada 320×740, 360×780, 390×844, 430×932, 667×375, 768×1024, 1024×768, dan 1280×800 tanpa overflow horizontal. Pengujian memakai viewport browser, bukan perangkat fisik.

## Edit langsung dari Absensi dan Riwayat

- Absensi yang sudah selesai memiliki tombol Ubah catatan di atas formulir. Draf tetap dapat diisi langsung. Riwayat menyediakan Ubah catatan pada tabel desktop dan kartu mobile untuk catatan aktif, termasuk draf; catatan dihapus tidak memiliki tindakan edit.
- Kedua halaman menggunakan komponen EditAttendance yang sama dengan Pendapatan. Formulir memuat tanggal, jam kerja, dan istirahat tersimpan. Validasi tanggal duplikat serta perhitungan dengan tarif asli tetap melalui updateAttendance.
- Penyimpanan memperbarui data pada halaman asal. Di Absensi, tanggal terpilih dan parameter URL mengikuti tanggal hasil edit sehingga muat ulang tetap membuka catatan yang sama. Filter dan halaman Riwayat tetap dipertahankan; posisi catatan dapat berubah sesuai waktu pembaruan atau keluar dari filter.
- Fokus keyboard kembali ke pemicu ketika membatalkan. Setelah menyimpan di Riwayat, fokus menuju judul daftar karena baris dapat berpindah atau hilang dari filter. Absensi memakai tombol edit baru atau judul halaman bila catatan berubah menjadi draf.
- QA database lokal: edit jam pulang dan perhitungan otomatis; muat ulang; perubahan tanggal; penolakan tanggal duplikat; pembatalan tanpa perubahan; tarif tersimpan ¥1.200 tetap dipakai meskipun tarif akun ¥1.300; mempertahankan filter; menyelesaikan draf melalui popup mobile; mengembalikan catatan selesai menjadi draf dan menampilkan kembali bilah simpan; tidak ada tindakan edit untuk catatan dihapus.
- Tampilan diperiksa pada lebar 320, 390, 667 (lanskap), 768, 1024, 1200, 1280, dan 1440 px, termasuk tema terang/gelap. Tidak ada overflow horizontal; dialog dapat digulir pada layar pendek. Pemeriksaan menggunakan viewport browser, bukan perangkat fisik. Seluruh 56 tes, lint, dan build produksi lulus.

## Validasi lokal

- 19 tes domain dan pemilih jam lulus, termasuk pemilihan tanggal sumber, draf/riwayat dihapus, dua istirahat, batas tahun, 24 jam, 60 posisi menit, area tengah jarum, dan validasi input manual.
- Build produksi dan lint lulus.
- Browser Chrome, menggunakan database QA lokal: nilai awal dari catatan sebelumnya; tarif baru tetap dipakai; geser jarum 9 ke 10 lalu menit 17; batal; 23:59; input manual dan penolakan input ambigu; kosongkan jam pulang; simpan dua istirahat dan muat ulang; pindah tanggal dan salin nilai baru; draf tetap utuh; tanggal tanpa riwayat kosong.
- Dialog edit bertingkat: menerapkan waktu hanya menutup pemilih; Escape juga hanya menutup pemilih; membatalkan edit tidak menyimpan perubahan sementara.
- Formulir dan popup diuji di tema terang/gelap pada 320×740, 360×780, 390×844, 430×932, 768×1024, 835×1110, 1024×768, 1280×800, 1920×1080, dan 844×390. Tidak ditemukan overflow horizontal. Pemeriksaan ini menggunakan simulasi ukuran browser, bukan perangkat iOS/Android fisik.
