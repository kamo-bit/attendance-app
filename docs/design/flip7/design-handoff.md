# AbsenKuy — Flip7 Revamp

Project: https://stitch.withgoogle.com/projects/12419382858788662715

Requested scope: a separate Google Stitch design project using the supplied Flip7 design system. Design only; existing CoinPulse project and application source stay unchanged.

## Visual direction

Warm retro tactile styling: mint #EFF8F7 canvas, white cards, cream #FFF8E7 inputs, teal #2BA8A2, coral #EF6C4A, gold #FFD23F primary actions. Extra-bold system sans headings, pill buttons, colored shadows, restrained folded ribbons and dashed dividers. Convert mini-program rpx values to practical web sizes and use at least 44px touch targets.

Adapt visual styling to attendance; do not introduce card-game scoring, competitive rankings or game branding.

## Screen plan

Eight page families, each Desktop, Tablet, Mobile: Attendance, History, Monthly earnings, Yearly earnings, Sign in, Create account, Forgot password, Reset password.

Supporting flows: edit attendance, confirm deletion, edit holidays, recovery outcomes and form states.

## Functional requirements

- Manual time entry with historical dates and 0–2 breaks; explicit Save rate.
- Daily example: 09:00–18:00 minus 12:00–13:00 break = 8 hours × ¥1,200 = ¥9,600.
- History retains Created, Edited and Deleted events ordered by latest update.
- Monthly example: payroll Aug 21–Sep 20, 2026; 128h, 16 days, ¥153,600. Distinguish payroll period from calendar month.
- Yearly example: Jan–Sep each ¥153,600, total ¥1,382,400, 1,152h, 144 days; Oct–Dec no data.
- Mobile summary before Save; history cards instead of overflowing table; readable seven-column calendar.
- No invented overtime premiums, taxes, security guarantees, biometric terminals, exports or time rounding.
- Desktop sidebar; tablet top navigation; mobile bottom navigation. Auth pages have no application navigation.

Design review and implementation validation are separate. Device frames document intended responsive composition; production responsiveness must be tested during implementation.

## Delivered in Stitch

32 numbered frames: 24 main designs (8 page families x Desktop/Tablet/Mobile) and 8 supporting designs. Desktop width1280px, tablet833–840px, mobile390–393px. Supporting frames09–13 cover editing, deletion confirmation, holiday selection, recovery outcomes, and form states.

Reviewed rendered text for core calculations, restored editable break inputs on desktop, removed unsupported overtime/tax/biometric/export claims, and corrected mobile hourly-rate wrapping. Inspected mobile earnings and tablet attendance visually. Initial post-resize inspection found no horizontal document overflow in all32 frames. Final inspection reconfirmed31 rendered frames; the mobile earnings iframe was temporarily unmounted by canvas virtualization, after its text correction had been verified separately.

Two state reference boards have taller outer frames to expose their examples; their embedded documents can retain their own scroll area. They are reference boards rather than production pages.

## Adaptations and implementation notes

Stitch retains Plus Jakarta Sans for much of its generated typography and Space Grotesk in the theme label token, despite the requested system-font stack. The palette and tactile styling follow Flip7; exact system-font matching remains a handoff adjustment. Native time controls can show AM/PM according to browser locale even when their stored values use24-hour time.

These are responsive layout designs, not a deployed responsive application. Production320–1920px behavior, keyboard navigation, contrast, touch target sizes, form validation and backend workflows still require implementation testing. Existing CoinPulse project was preserved. No application source code was changed and no build/test run was needed for this design-only task.

## Bahasa antarmuka

Revisi terbaru menggunakan bahasa Indonesia untuk navigasi, formulir, riwayat, kalender, pendapatan, autentikasi, dialog, validasi dan pesan status. Brand AbsenKuy dan Google tetap; mata uang tetap JPY/yen. Format tampilan Indonesia menggunakan pemisah ribuan titik (contoh ¥153.600 dan ¥1.200/jam), nama hari/bulan Indonesia, dan satuan jam/menit.

Istilah utama: Absensi, Riwayat, Pendapatan, Jam masuk, Jam pulang, Istirahat, Upah per jam, Estimasi pendapatan, Masuk, Buat akun, Kata sandi, Simpan perubahan, Batal, Hapus catatan.

Lokalisasi dilakukan pada desain Google Stitch. Implementasi aplikasi Next.js belum diubah.

### Hasil pemeriksaan lokalisasi

- 32 frame aktif berbahasa Indonesia: 24 halaman utama dan 8 alur pendukung.
- 32 frame Inggris sebelumnya diberi awalan `Arsip EN —` dan dipertahankan sebagai referensi.
- Lebar frame aktif: desktop1280px, tablet sekitar835px, mobile390px.
- Pemeriksaan dokumen terender pada seluruh32 frame aktif tidak menemukan overflow horizontal.
- Kata serapan umum seperti email, reset dan shift masih digunakan pada beberapa teks. Satu nominal pada latar dialog hari libur mobile masih memakai pemisah ribuan koma; nilai dan mata uang tetap yen.
- Tab hasil: https://stitch.withgoogle.com/projects/12419382858788662715
