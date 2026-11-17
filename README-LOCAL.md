# Mencoba KDKMP secara lokal

Mode demo menjalankan aplikasi dan backend simulasi di komputer ini. Mode ini tidak mengirim permintaan atau menyimpan data ke Supabase. Data demo berada di memori proses dan akan hilang saat server dihentikan.

## Jalankan

1. Pastikan Node.js sudah terpasang.
2. Buka PowerShell di folder proyek.
3. Jalankan:

   ```powershell
   .\tools\start-local.ps1
   ```

4. Buka <http://127.0.0.1:8012>.
5. Masuk dengan salah satu peran. Untuk Manager/Pengurus gunakan NIK demo `1604010101001`. Kata sandi awal demo: `demo1234` untuk setiap role.
6. Hentikan server dengan `Ctrl+C`.

Jika port 8012 sudah dipakai, jalankan `.\tools\start-local.ps1 -Port 8013`, lalu buka alamat pada port tersebut.

Server membatasi akun Manager/Pengurus untuk menyimpan hanya pada NIK miliknya. Semua role dapat melihat koperasi demo; Tamu hanya dapat melihat data. Ringkasan dan ekspor hanya bisa dibuka PMO. Status aplikasi menampilkan **Simulasi lokal** agar tidak tertukar dengan koneksi Supabase.

## Batasan mode demo

- Hanya ada satu koperasi contoh.
- Data penilaian tersimpan di memori sampai server dihentikan.
- Mode ini memeriksa alur UI dasar. Ia tidak menggantikan uji login dan kebijakan akses di Supabase.
- File `supabase-config.js` tetap menunjuk ke proyek Supabase aktif untuk penggunaan hosting. Server demo menggantinya secara sementara saat aplikasi dibuka lewat alamat lokal.
- Pergantian kata sandi demo hanya berlaku selama proses server lokal berjalan; database demo lokal bersifat sementara.

## Build Netlify

Repositori ini sudah memiliki `netlify.toml`. Netlify menggunakan perintah `node tools/build-netlify.js` dan menerbitkan folder `dist`. File Supabase di `supabase-config.js` memakai URL proyek dan publishable key yang memang digunakan di browser. Tidak ada service-role key di bundle.

Untuk menguji hasil build sebelum commit:

```powershell
node tools/build-netlify.js
```

Lalu buka `dist/index.html` melalui web server lokal (bukan `file://`) atau hubungkan repositori ke Netlify dengan build command dan publish directory di atas.

## Jalankan lokal dengan Supabase live

Untuk melihat daftar wilayah dan koperasi dari database aktif sebelum deploy, jalankan:

```powershell
.\tools\start-live-local.ps1
```

Buka <http://127.0.0.1:8014>. Server ini menyajikan build Netlify tanpa backend simulasi. Login dan penyimpanan menggunakan Supabase aktif, jadi perubahan yang disimpan akan masuk ke database tersebut. Jika port 8014 sedang digunakan, jalankan `.\tools\start-live-local.ps1 -Port 8015`.
