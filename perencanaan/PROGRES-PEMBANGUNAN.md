# Progres Pembangunan KDKMP

Status diperbarui: 17 November 2026.

## Status aplikasi

| Area | Status | Catatan |
|---|---|---|
| Acuan Form B | Siap | 22 kelompok dan 96 item; katalog, tipe, dan aset gambar dipakai frontend. |
| Database Supabase | Siap untuk uji aplikasi | Project aktif `kdmplahat`; tabel data dan RPC terhubung. Migrasi remote terbaru `20261117010511` membuat password per akun. |
| Akses role | Diterapkan | PMO dapat membuka ringkasan/ekspor. Semua role dapat membaca koperasi; Manager/Pengurus hanya dapat menyimpan pada NIK terdaftar; Tamu baca-saja. Batasan ditegakkan oleh RPC. |
| Formulir | Diterapkan | Pilihan keberadaan dimulai kosong. Kelompok dibuka sebagai jendela kerja; setiap item dapat dilipat. Isian lintas koperasi dibuka dalam mode nonaktif. |
| Profil & sandi | Diterapkan | Profil memuat role, data Manager/Pengurus terdaftar, NIK, desa, kecamatan. Password tiap akun dapat diganti sendiri; sesi akun itu berakhir setelah perubahan. |
| Audit | Diterapkan | Login berhasil, penyimpanan form, dan ganti password mencatat actor NIK/role, NIK koperasi tujuan, IP request, user agent, waktu UTC, dan waktu lokal GMT+7. |
| RLS & akses tabel | Diterapkan | Tabel sensitif memakai RLS dan policy penolakan eksplisit; grant langsung identitas, isian, dan log dicabut. Security advisor Supabase saat verifikasi tidak melaporkan temuan. |
| Build hosting | Siap | `netlify.toml` dan `tools/build-netlify.js` menyiapkan bundle statis ke `dist/`. |

## Verifikasi yang sudah dilakukan

- Pemeriksaan sintaks JavaScript untuk frontend dan script build lulus.
- Build Netlify lokal menghasilkan `dist` berisi frontend dan aset yang diperlukan.
- Uji transaksi Supabase dengan data/kredensial sementara di-rollback: login PMO, daftar koperasi, dashboard, profil, muat dan simpan form, catatan audit GMT+7, ganti password, lalu login dengan password baru.
- Uji RBAC Supabase dalam transaksi rollback: Manager dapat membaca koperasi lain namun tidak menyimpan ke sana; dashboard ditolak untuk Manager; simpan ditolak untuk Tamu.
- Supabase Security Advisor kembali tanpa lint temuan setelah RLS dan deny policy diterapkan.

## Sisa langkah sebelum rilis umum

1. Uji login UI memakai password operasional asli di browser setelah situs lokal/Netlify dapat dijangkau dari perangkat. Nilai hash password tidak dibaca atau diubah selama pengerjaan.
2. Hubungkan repositori ini ke GitHub/Netlify dan lakukan deploy. Belum ada remote GitHub di checkout ini, jadi belum ada commit atau deploy yang dikirim.
3. Setelah deploy, lakukan smoke test tiap role dan ganti password dari Profil sesuai otorisasi role bersama.

IP audit berasal dari header request yang diteruskan Supabase/proxy. Catatan IP berguna untuk investigasi, tetapi identitas pelaku tetap didukung oleh role, NIK, sesi, user agent, dan waktu; IP bukan bukti identitas tunggal.

## Catatan struktur

- Identitas Laci Gerai dan Laci Klinik sudah terpisah di katalog database; tidak ada penilaian lama yang perlu dipindahkan. Migrasi lokal `20261117180000_laci_dorong_identity.sql` adalah catatan untuk setup database baru dan tidak perlu diterapkan lagi pada project aktif.
- Akun password per individu berjumlah 757: 2 PMO, 377 Manager, 377 Pengurus, dan 1 Tamu. Hash awal per akun disalin dari hash role lama agar password awal tetap sama; penggantian hanya mengubah akun itu. Akun Tamu tetap satu akun bersama.
- Supabase publishable key dipakai oleh frontend sesuai peruntukannya. Jangan memasukkan service-role key ke berkas hosting.
