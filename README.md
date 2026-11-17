# KDKMP Lahat · Pendataan Pra-Verval

Aplikasi Form B untuk pendataan sarana-prasarana KDKMP Lahat. Frontend statis berkomunikasi dengan Supabase melalui RPC; kata sandi dan sesi disimpan di sisi server, bukan di bundle browser.

## Coba secara lokal

Butuh Node.js. Jalankan `.\tools\start-local.ps1`, lalu buka `http://127.0.0.1:8012`. Akun demo awal menggunakan kata sandi `demo1234`; Manager/Pengurus memakai NIK `1604010101001`, sedangkan PMO memilih `1111` atau `2222`. Backend lokal adalah simulasi in-memory dan tidak menyentuh Supabase.

Untuk mencoba frontend build yang memakai Supabase live sebelum deploy, jalankan `tools/start-live-local.ps1`, lalu buka `http://127.0.0.1:8014`. Build ini tidak memakai backend demo; login dan penyimpanan terhubung ke database Supabase yang dikonfigurasi.

## Deploy ke Netlify

Hubungkan repositori GitHub ke Netlify. Konfigurasi build sudah berada di `netlify.toml`:

- Build command: `node tools/build-netlify.js`
- Publish directory: `dist`

Build script hanya menyalin frontend dan aset yang diperlukan ke `dist`; folder perencanaan, tools, dan migrasi database tidak diterbitkan sebagai situs. Pengaturan Supabase frontend ada di `supabase-config.js` menggunakan URL dan publishable key. Jangan pernah menggantinya dengan `service_role` key.

## Database

Struktur dan fungsi Supabase ada di `supabase/migrations`. Migrasi remote individu-passwords `20261117010511` sudah diterapkan pada project Supabase aktif. Login menggunakan akun tersendiri: 2 PMO, 377 Manager, 377 Pengurus, dan 1 Tamu. Hash awal diwarisi dari hash role sebelumnya; setelah diganti, password hanya berubah untuk akun itu. Sesi berumur 12 jam, RBAC di RPC, dan log audit mencatat role, NIK pelaku, koperasi target, IP dari header request, user agent, waktu UTC, serta waktu lokal GMT+7.

## Hak akses

- PMO: Ringkasan, Koperasi, Pendataan, Ekspor, dan Profil.
- Manager/Pengurus: Koperasi, Pendataan, dan Profil. Bisa membaca koperasi lain, namun hanya menyimpan pada NIK yang menjadi aksesnya.
- Tamu: Koperasi, Pendataan baca-saja, dan Profil.

Ringkasan dibatasi di RPC server hanya untuk PMO. Tabel identitas, sesi, isian, dan log tidak menerima akses tabel langsung dari `anon` atau `authenticated`; browser memakai RPC yang memvalidasi sesi dan role.
