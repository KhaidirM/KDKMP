# PRD — Sistem Pendataan KDKMP Kabupaten Lahat

| Atribut | Nilai |
|---|---|
| Versi | 2.0 — dokumen serah-terima menyeluruh |
| Status | Snapshot implementasi dan kebutuhan produk; bukan bukti rilis produksi |
| Tanggal | 16 November 2026 |
| Pemilik produk | Pemilik proyek KDKMP Lahat; nama penanggung jawab produk belum ditetapkan di sumber |
| Pembaca utama | AI/pengembang berikutnya yang akan melanjutkan aplikasi |
| Cakupan | Aplikasi pendataan Pra-Verval, terutama Form B Sarana-Prasarana dan kesiapan operasional |
| Lokasi perencanaan kanonis | Folder `perencanaan/` |

> **Batas verifikasi:** dokumen ini disusun dari berkas lokal proyek dan perubahan percakapan terakhir. Saya tidak memeriksa browser, tidak masuk ke Supabase, dan tidak dapat memastikan migrasi mana yang sudah diterapkan pada database jarak jauh atau kode mana yang sedang dilayani pada deployment. Pernyataan “sudah ada” di bagian implementasi berarti terlihat di source lokal, bukan sudah terverifikasi di lingkungan produksi.

## 0. Instruksi penting untuk AI/pengembang berikutnya

1. **Jadikan `perencanaan/LIST-GRUP-ITEM-RENCANA-PENILAIAN-REVISI.md` acuan utama untuk Form B.** Baca seluruh 96 entri, bukan hanya PRD ini. Salinan JSON runtime ada di `assets/catalog.json`; keduanya harus tetap sinkron.
2. `perencanaan/STRUKTUR-FORM-PENDATAAN-BARU.docx` hanya pelengkap untuk alur dan penyimpanan. Jika isinya bertentangan dengan daftar revisi atau keputusan langsung pemilik, ikuti daftar revisi dan keputusan terbaru.
3. `perencanaan/STRUKTUR-FORM-PENDATAAN.md`, `perencanaan/PROMPT-LOGIKA-KONDISI-ITEM.md`, PRD versi lama, dan rancangan lama adalah **dokumen historis**. Jangan menghidupkan lagi Status sumber Permanen/Sementara, aturan kondisi berbasis jumlah aktual yang bertentangan dengan acuan terbaru, batas catatan 1.000 karakter, atau validasi simpan yang memblokir catatan kosong.
4. **Rencana bukan Status sumber.** Rencana tetap ditampilkan pada setiap item, hanya baca. Jika rencana tidak diketahui, tampilkan `—`/null; jangan menebak. Untuk Sumber air, field Permanen/Sementara sudah dihapus. Rencana Sumber air saat ini tidak diketahui dan ditampilkan `—`.
5. **Untuk item dengan Rencana tepat 1 unit:** kondisi adalah pilihan tunggal. Memilih kondisi memindahkan nilai jumlah `1` ke kondisi itu, mengubah kondisi lain menjadi `0`, lalu menghitung Jumlah aktual sebagai jumlah alokasi.
6. **Untuk jumlah/kondisi lain:** nilai jumlah yang muncul dimulai dari `0`; tidak ada jumlah aktual lapangan yang boleh dikarang dari angka Rencana. Pada item yang memakai rincian kondisi, Jumlah aktual adalah total Baik/Berfungsi + Rusak + Belum dicek. Item persediaan Struk dan Thermal Label memakai input Jumlah aktual manual dan default `0`, tanpa alokasi kondisi per unit.
7. Keberadaan awal mengikuti acuan revisi: **Tidak Ada**. Simpan tetap eksplisit melalui tombol Simpan; kolom wajib kosong menampilkan pengingat dan tidak memblokir simpan. Nilai tidak mungkin tetap harus ditolak.
8. Pemilik proyek meminta desain UI berikutnya ditentukan oleh AI baru. PRD ini menetapkan struktur informasi, aturan data, akses, dan perilaku; **jangan menyalin/mempertahankan desain visual sekarang sebagai keharusan**. UI saat ini telah dinilai tidak memuaskan pemilik proyek.
9. Jangan mengendalikan atau memeriksa browser milik pemilik proyek. Lakukan penelusuran lewat berkas kode, migrasi, dan sumber data proyek. Pemilik proyek menjalankan preview sendiri bila diperlukan.
10. Jangan menjalankan migrasi pada database nyata, mengubah data induk koperasi, mereset data, atau menghapus sumber lama tanpa rencana migrasi dan persetujuan eksplisit. Audit perbedaan lokal/jarak jauh lebih dulu.

## 1. Ringkasan produk dan kondisi terbaru

Sistem Pendataan KDKMP Kabupaten Lahat adalah aplikasi web untuk mencatat keadaan aktual sarana-prasarana koperasi, membandingkannya dengan rencana katalog, memantau kelengkapan dan masalah, serta menyediakan keluaran data. Sumber rancangan menyebut cakupan 377 koperasi; angka pada database jarak jauh perlu dikonfirmasi karena PRD ini tidak terhubung ke lingkungan tersebut.

Snapshot lokal saat dokumen dibuat:

- Form B revisi berisi **22 grup dan 96 item**, urutan 1–96. Daftar seluruh item, target, dan penilaiannya berada di file acuan utama dan dilampirkan lagi dalam Appendix A PRD ini.
- Aplikasi adalah web statis berbasis HTML, CSS, dan JavaScript tanpa bundler/package manifest yang teridentifikasi. Form dan Ringkasan mengambil data melalui Supabase REST/RPC.
- Daftar revisi Markdown dan `assets/catalog.json` sudah dicocokkan: 96 item; nama, Rencana, dan label Penilaian cocok tanpa perbedaan.
- Nilai Rencana kosong pada 13 item sudah distandardisasi menjadi `—` di daftar dan katalog lokal. Di aplikasi target numeriknya tetap null, sehingga tidak menjadi angka nol.
- Status Permanen/Sementara tidak digunakan pada Sumber air. Isian yang tersimpan dengan kunci lama `status_sumber`/`status_rencana` dibuang saat form dimuat/disimpan.
- Logika pilihan kondisi/jumlah terkini sudah ditambahkan di `app.js`, tetapi database, ringkasan, ekspor, identitas item, migrasi, dan implementasi runtime belum seluruhnya konsisten. Lihat daftar blocker.
- Folder rencana kanonis baru adalah `perencanaan/`. Dokumen lama disalin ke sana agar sumber tetap utuh; folder `planing/` lama masih ada karena Windows menolak pemindahan folder saat proses ini berjalan. Jangan menganggap dua folder tersebut sebagai dua sumber yang sama-sama berwenang; gunakan prioritas di Bagian 2.

## 2. Prioritas sumber dan keputusan yang berlaku

### 2.1 Urutan sumber

| Prioritas | Sumber | Kewenangan |
|---|---|---|
| 1 | Keputusan langsung pemilik proyek paling baru dalam percakapan | Menang atas dokumen/kode lama untuk isu yang sudah dikoreksi secara eksplisit. |
| 2 | `perencanaan/LIST-GRUP-ITEM-RENCANA-PENILAIAN-REVISI.md` | Acuan utama nama grup/item, urutan, label Rencana, daftar Penilaian dan field khusus. |
| 3 | `perencanaan/STRUKTUR-FORM-PENDATAAN-BARU.docx` | Pelengkap alur, akses, progres, penyimpanan dan aksesibilitas; tidak boleh mengubah Bagian 2.2. |
| 4 | `assets/catalog.json` | Metadata yang benar-benar dibaca aplikasi untuk nama, urutan, target tampilan, dan Penilaian. Harus direkonsiliasi ke prioritas 1–2. |
| 5 | Migrasi Supabase dan data katalog | Menjelaskan skema/perilaku server yang dimaksudkan; file migrasi tidak membuktikan sudah diterapkan. |
| 6 | Rancangan/PRD/form/prompt lama dan versi duplikat folder `planing/` | Referensi historis saja bila tidak bertentangan. |

### 2.2 Keputusan terbaru tentang Form B

- Kolom Rencana hadir pada **semua 96 item**, tidak dapat diubah di form. Rencana adalah referensi katalog dan bukan jumlah aktual lapangan.
- Nilai kosong/tidak diketahui ditampilkan `—` dan disimpan sebagai null pada data numerik bila memang kolom numerik dipakai. Jangan mengubahnya menjadi `0`, sebab nol memiliki arti kuantitas aktual.
- Sumber air: hapus pilihan status sumber Permanen/Sementara. Pertahankan Rencana (sekarang `—`), Keberadaan, Jenis sumber air, Terhubung ke instalasi, Catatan.
- Jumlah Rencana tepat 1 unit menghasilkan satu pilihan kondisi; nilai 1 berpindah ke kondisi terpilih, kondisi lain 0, Jumlah aktual merupakan total. **Kriteria tunggal ini memakai Rencana**, sesuai keputusan pemilik dan daftar revisi; jangan menggantinya dengan aturan “jumlah aktual = 1” dari prompt tambahan lama.
- Pada item dengan alokasi kondisi, jumlah alokasi yang belum dipilih bernilai nol; kotak jumlah muncul hanya ketika kondisi dipilih dan nilai awal kotaknya 0. Jumlah aktual adalah total semua alokasi. Perubahan kondisi harus memperbarui total seketika.
- Pada Rencana lebih dari 1 atau Rencana tidak diketahui, kondisi dapat dicatat beberapa sekaligus apabila item berkuantitas. Kuantitas yang baru ditampilkan mulai dari 0. Rencana tak diketahui bukan izin untuk mengisi target perkiraan.
- Item tanpa kebutuhan rincian kondisi tidak boleh diberi field alokasi kondisi hanya karena punya kolom khusus. Sesuaikan per item dengan kolom Penilaian utama.
- Struk dan Thermal Label adalah persediaan: Jumlah aktual manual (awal 0), Ketersediaan, Catatan; tidak ada Kondisi Baik/Rusak per unit.
- Catatan maksimum **800 karakter**. Jika jumlah Rusak > 0, tunjukkan pengingat Catatan wajib; pengingat tidak memblokir Simpan.
- Isian awal Keberadaan adalah Tidak Ada. Memilih Ada menampilkan isian turunan yang relevan. Mengubah status menjadi Tidak Ada membersihkan rincian yang sudah tidak relevan; perubahan individual saat ini meminta konfirmasi bila ada data rinci.
- Simpan dikendalikan pengguna. Jangan menyatakan tersimpan ke server sebelum server memberi konfirmasi. Draft lokal boleh bertahan bila simpan gagal.

## 3. Konteks, tujuan, dan hasil

### 3.1 Masalah yang diselesaikan

Pendataan dilakukan lintas koperasi dan dapat berlangsung dengan jaringan yang tidak stabil. Data perlu memisahkan Keberadaan, hasil pemeriksaan, kuantitas aktual, target rencana, dan kelengkapan. Ringkasan harus berasal dari data tersimpan yang dapat ditelusuri; data rencana dan data aktual tidak boleh tercampur.

### 3.2 Tujuan

1. Membuat pendataan lapangan konsisten terhadap Form B revisi.
2. Menyimpan fakta per koperasi dan per item dengan identitas yang stabil.
3. Memudahkan petugas melihat hal yang belum dinilai, tidak ada, kurang dari rencana, rusak, atau belum dicek.
4. Memberi PMO pemantauan lintas koperasi/wilayah tanpa mengarang angka.
5. Mencegah kehilangan draft dan penimpaan perubahan oleh sesi lain.
6. Membatasi operasi data berdasar peran di server/database, bukan hanya kontrol antarmuka.
7. Memberi AI berikutnya landasan perilaku dan struktur yang jelas tanpa menetapkan rancangan visual akhir.

### 3.3 Bukan cakupan keputusan visual

AI berikutnya bebas menentukan ulang layout, tipografi, warna, komponen, navigasi visual, dan cara interaksi selama tetap memenuhi kebutuhan data, aksesibilitas, responsivitas, serta perilaku di PRD/acuan. Gambar saat ini hanyalah desain yang ada, bukan persetujuan pemilik.

## 4. Pengguna dan hak akses

| Role | Melihat daftar koperasi | Melihat Form koperasi lain | Mengedit | Batas server saat ini |
|---|---:|---:|---|---|
| PMO | Ya | Ya | Semua koperasi | PIN role bersama; identitas PMO lokal mengenal dua NIK operator khusus. |
| Manager | Ya | Ya | Hanya koperasi yang NIK-nya dipakai saat login | Login membutuhkan NIK koperasi 13 digit yang tercatat pada tabel `manager`. |
| Pengurus | Ya | Ya | Hanya koperasi yang NIK-nya dipakai saat login | Login membutuhkan NIK koperasi 13 digit yang tercatat pada tabel `pengurus`. |
| Guest | Ya | Ya | Tidak | Tidak mempunyai NIK; RPC save menolak role Guest. |

### Ketentuan akses

- NIK koperasi adalah teks identitas, bukan nilai yang dihitung. Di tabel sumber induk lama tipenya dapat numerik, sehingga konversi ke string harus konsisten tanpa kehilangan digit.
- Manager/Pengurus boleh membaca form koperasi lain, tetapi tidak boleh menyimpan ke sana. Batas simpan harus divalidasi RPC/database.
- Role Guest hanya-baca.
- PMO dapat memilih koperasi dan mengedit sebagai pengisi biasa. Alasan koreksi PMO belum diwajibkan.
- Role/PIN saat ini berlaku bersama untuk satu role, bukan identitas pengguna individual. Log belum dapat mengatribusikan tindakan ke operator personal secara andal.
- Tombol yang dinonaktifkan di frontend bukan pengganti pemeriksaan akses server.

## 5. Cakupan modul

### Ada pada aplikasi lokal

- Login role/NIK/PIN melalui RPC.
- Ringkasan lintas koperasi, indikator wilayah, prioritas temuan.
- Daftar koperasi dengan pencarian/filter.
- Form B Sarpras per koperasi dengan grup dan item.
- Lihat gambar/spesifikasi katalog melalui modal.
- Simpan seluruh form secara eksplisit, draft lokal, status hasil simpan, dan pemeriksaan versi.
- Ekspor ringkasan dan detail dalam berkas **CSV**.

### Direncanakan, belum atau belum lengkap

- UI baru (desain diserahkan ke AI berikutnya).
- Konsistensi penuh seluruh 96 item, ID katalog, form, dashboard, ekspor, serta validasi server.
- Perbaikan keamanan operasional, prosedur deployment, dan bukti migrasi remote.
- Ekspor Excel `.xlsx` sesuai rancangan lama bila masih menjadi kebutuhan; perilaku lokal saat ini CSV, sehingga format final perlu dikonfirmasi.
- Foto bukti/lampiran: belum menjadi alur upload aktif. Jangan menyimpulkan keberadaan fitur hanya dari kolom DB `lampiran` atau dokumen historis.
- Status workflow `submitted/reviewed`, profil koperasi, integrasi Drive, dan pengaturan suara bukan fitur rilis aktif yang boleh diasumsikan.

## 6. Struktur form dan perilaku pendataan

### 6.1 Kerangka

Form dibangun dari 22 grup, dengan nomor item 1–96. Grup dapat diberi status Ada/Tidak Ada untuk mengisi keberadaan anggota grup secara massal; status otomatis Sebagian/khusus digunakan saat item bercampur. Setiap item tetap dapat disunting satu per satu. Susunan visual final ditentukan AI berikutnya, tetapi makna data dan urutan katalog harus dipertahankan.

Tiap item dapat meliputi, sesuai penilaian yang tercantum: Rencana (selalu tampil), Keberadaan, Tipe/Jenis, Gambar/spek, Kondisi/Fungsi, Jumlah aktual/rincian jumlah, field khusus, dan Catatan. Jangan tampilkan field yang tidak diminta untuk item tersebut hanya berdasarkan asumsi.

### 6.2 Semantik field

| Field | Semantik |
|---|---|
| Rencana | Nilai katalog, baca-saja, selalu tampil. Rentang/label harus dipertahankan; yang belum diketahui `—`. |
| Keberadaan | Status lapangan `Ada` atau `Tidak Ada`; nilai awal tampilan `Tidak Ada` menurut acuan revisi. Nilai kosong pada record lama tetap mungkin ada. |
| Tipe/Jenis | Nilai varian yang berasal dari master katalog Supabase jika assessment meminta tipe dan opsi tersedia. |
| Kondisi | Baik (atau Berfungsi untuk fungsi), Rusak, Belum dicek. Digunakan hanya pada item yang assessment-nya memerlukan. |
| Jumlah alokasi kondisi | Angka integer nonnegatif untuk kategori kondisi yang dipilih. Input awal 0, kecuali pilihan tunggal Rencana 1 yang otomatis bernilai 1. |
| Jumlah aktual | Pada item berbasis kondisi: derived total alokasi. Pada item persediaan tertentu: input lapangan manual, awal 0. Tidak sama dengan Rencana. |
| Catatan | Teks maksimum 800 karakter. Rusak > 0 menampilkan pengingat wajib, tetapi tidak memblokir simpan. |
| Gambar/spek | Referensi katalog, bukan input bukti lapangan. Gambar dibuka saat diminta; teks spesifikasi dirender sebagai teks, bukan HTML. |

### 6.3 Aturan kuantitas dan kondisi

1. Jika Rencana tepat satu unit dan item mempunyai jumlah/kondisi, kondisi memakai seleksi tunggal. Kondisi terpilih mempunyai alokasi 1; lainnya 0. Bila pilihan diganti, alokasi 1 ikut pindah.
2. Jika Rencana lebih dari satu, rentang, atau tidak diketahui, item berkuantitas memakai seleksi kondisi jamak. Kuantitas untuk kondisi yang dipilih terlihat dan default-nya 0.
3. Jumlah aktual tidak diinput ulang pada kelompok item alokasi; nilainya dihitung dari `baik + rusak + belum_dicek`. Tampilan ringkasan jumlah aktual juga dimulai dari 0.
4. Jangan otomatis mengisi jumlah lapangan berdasarkan target Rencana. Nilai Rencana hanya pembanding.
5. Untuk target rentang seperti `10–12 unit` atau `12–16 unit`, label penuh tetap ditampilkan. Kode lokal saat ini mengambil angka pertama sebagai ambang minimum; makna rentang dan kemungkinan batas atas harus diputuskan/diterapkan konsisten di UI, database, dashboard, dan ekspor.
6. Untuk Rencana `—`, tidak ada pembanding kekurangan rencana. Item tetap dapat memiliki alokasi kondisi dan jumlah aktual bila daftar Penilaian menyebut Jumlah.
7. Struk/Thermal Label menggunakan jumlah aktual manual, ketersediaan, dan catatan; bukan alokasi kondisi.
8. Jika Keberadaan Tidak Ada, rincian turunan disembunyikan/dinonaktifkan dan data kondisi/jumlah yang tidak relevan dikosongkan sesuai alur konfirmasi. Jangan menghapus Catatan tanpa konfirmasi/keputusan.
9. Pengingat jumlah belum lengkap, jika ditampilkan, tidak boleh diartikan sebagai perubahan status Keberadaan.

### 6.4 Field khusus yang telah ditentukan

- **Sumber air (71):** jenis sumber air (`Sumur bor`, `Sumur warga`, `Sumur desa`, `PAM desa`, `PAMSIMAS`, `Aliran sungai`, `Lainnya`); keterhubungan instalasi air Ya/Tidak; Catatan. Tidak ada Status sumber Permanen/Sementara. Rencana tetap `—`.
- **Pompa air (72):** status fungsi (`Berfungsi`, `Belum dicek`, `Rusak`) selain kondisi/jumlah/catatan sesuai daftar utama.
- **Keran dan wastafel (73–75):** aliran air (`Teraliri`, `Tidak teraliri`, `Belum dicek`), kondisi, jumlah, catatan. Bukan untuk sumber air atau WC.
- **WC (76–77):** tipe Jongkok/Duduk; Bidet/JET washer Ada/Tidak ada; terhubung septic tank Ya/Tidak; kondisi, jumlah, catatan. Tidak memakai field aliran air.
- **Instalasi listrik (79):** kelayakan (`Layak`, `Tidak layak`) dan letak (`Di dalam gudang utama`, `Di luar gudang utama`, `Lainnya`) bersama Keberadaan/Catatan.
- **SLO (80) dan Sumber listrik (81):** Keberadaan dan Catatan sesuai daftar; tidak menambah field yang tidak tercantum.
- **MCB (82):** daya terpasang dalam pilihan VA yang ada di kode, termasuk `Lainnya` dengan nominal; kondisi/catatan sesuai daftar. Daftar final daya tetap harus ditinjau pemilik.
- **Panel listrik (83):** lokasi/letak panel dan kondisi/catatan sesuai daftar.
- **Lampu (84–91):** aliran listrik Ya/Tidak/Belum dicek, Saklar Ada/Tidak ada, kondisi, jumlah, catatan sesuai item.
- **Colokan (92–96):** aliran listrik, kondisi, jumlah, catatan sesuai daftar.
- **Internet (30):** jenis koneksi (`Fiber optik`, `Kabel`, `Modem seluler`, `Radio wireless`, `Lainnya`) serta status berfungsi.
- **Software kasir (31):** status fungsi.
- **Struk dan Thermal Label (58–59):** Jumlah aktual dan Ketersediaan (`Tersedia`/`Tidak tersedia`), tanpa condition allocation.

Daftar assessment item demi item pada acuan utama tetap berwenang bila ringkasan field khusus ini berbeda.

## 7. Katalog Form B versi lokal

| No. grup | Nama grup | Jumlah item | Nomor item |
|---:|---|---:|---:|
| 1 | Kendaraan | 3 | 1–3 |
| 2 | 1 Set Mesin Kasir | 9 | 4–12 |
| 3 | 1 Set CCTV | 17 | 13–29 |
| 4 | Konektivitas & Software | 2 | 30–31 |
| 5 | Air Conditioner | 2 | 32–33 |
| 6 | Furniture Gerai | 4 | 34–37 |
| 7 | Apotek | 1 | 38 |
| 8 | Perlengkapan Klinik | 5 | 39–43 |
| 9 | Perlengkapan Rak Gerai | 3 | 44–46 |
| 10 | APAR | 2 | 47–48 |
| 11 | Keranjang Belanja | 2 | 49–50 |
| 12 | Seragam KDKMP | 2 | 51–52 |
| 13 | Perlengkapan Lain | 4 | 53–56 |
| 14 | ATK | 3 | 57–59 |
| 15 | Alat Kebersihan | 3 | 60–62 |
| 16 | Komputer | 1 | 63 |
| 17 | Beverages & Frozen Foods | 2 | 64–65 |
| 18 | Ventilasi | 2 | 66–67 |
| 19 | Perlengkapan Lain | 1 | 68 |
| 20 | Keamanan & Kehadiran | 2 | 69–70 |
| 21 | Instalasi Air | 8 | 71–78 |
| 22 | Instalasi Listrik | 18 | 79–96 |
| **Jumlah** | **22 grup** | **96** | **1–96** |

Kedua grup bernama **Perlengkapan Lain** berbeda secara posisi dan harus tetap memiliki ID grup unik. Jangan menggabungkannya berdasarkan nama tampilan saja.

## 8. Alur pengguna yang harus didukung

1. Login dengan peran, identitas/NIK sesuai role, dan PIN.
2. Sistem memvalidasi sesi dan memperoleh daftar koperasi/katalog yang dibutuhkan.
3. Pengguna memilih koperasi yang diizinkan; manager/pengurus dapat membaca koperasi lain tetapi hanya dapat mengedit koperasi yang terikat ke NIK login.
4. Form memuat nilai server, kemudian menggabungkan draft lokal per NIK bila ada.
5. Pengguna membuka grup, menggunakan status kelompok bila cocok, lalu mengecek hasil mass-fill dan mengisi per item.
6. Perubahan memperbarui progres lokal dan tersimpan sebagai draft perangkat.
7. Pengguna menekan Simpan seluruh form; server mengecek token, kewenangan, versi, nilai, dan menyimpan dalam satu transaksi.
8. Jika sukses, tampilkan konfirmasi server, muat ulang nilai/versi server, dan hapus draft yang sesuai.
9. Jika gagal atau konflik, pertahankan draft dan jelaskan statusnya; konflik tidak boleh diam-diam menghapus/mengganti data lokal.
10. Ringkasan dan ekspor harus memperlihatkan nilai derived kondisi dari source data yang sama dengan form.

## 9. Arsitektur dan struktur source saat ini

| Lokasi | Isi/fungsi saat ini |
|---|---|
| `index.html` | Shell halaman dan memuat `supabase-config.js`, `app.js`, `auth.js`. |
| `app.js` | Bootstrap, routing halaman, katalog, Ringkasan, daftar koperasi, Form B, state/draft, serialize/save, CSV, media modal. |
| `auth.js` | UI login, pemilih role/NIK/wilayah, RPC login, penyimpanan token dan role pada sessionStorage. |
| `app.css`, `pages.css`, `auth.css` | Styling visual saat ini; bukan desain wajib untuk iterasi UI berikutnya. |
| `supabase-config.js` | URL Supabase dan publishable key browser. Jangan menaruh service-role key/password di sini. Nilai konfigurasi tidak dicantumkan dalam PRD. |
| `assets/catalog.json` | Sumber runtime lokal untuk daftar revisi, item, target label, assessment, dan ID yang dikonsumsi aplikasi. |
| `assets/catalog-images.json` | Pemetaan gambar saat ini berdasarkan nomor/order item. |
| `assets/img/sarpras/` | Aset JPEG. Audit lokal: 176 referensi gambar unik dalam pemetaan, 177 file fisik; `placeholder.jpg` belum direferensikan. Referensi tanpa file: 0. Pastikan placeholder memang fallback sengaja. |
| `assets/catalog-seed.sql` | Seed katalog lama/umum; direvisi sebagian pada workspace. |
| `assets/catalog-details.json`, `assets/catalog-details-seed.sql`, `assets/catalog-details-01.sql` s.d. `-07.sql` | Seed/detail spesifikasi katalog; perlu rencana urutan dan sumber tunggal yang jelas. |
| `supabase/migrations/` | Definisi tabel, RLS, RPC, versioning, katalog, akses gambar, dan aturan penilaian. Isi file belum memastikan semua migration sudah diterapkan remote. |
| `start-preview.bat` | Menjalankan Python static HTTP server di port 8000 dari direktori script; tidak menjalankan build atau migrasi. |
| `perencanaan/` | Dokumen PRD dan acuan kerja kanonis baru. Salinan berkas planning berada di sini. |

Tidak ditemukan `package.json`, bundler, framework frontend, folder test otomatis, pipeline CI, atau `netlify.toml` pada inventaris root yang diperiksa. Konfirmasi sebelum menambahkan tool/build baru. Tidak ada permintaan untuk membuat desain visual pada PRD ini.

### Sumber katalog campuran

`loadCatalog()` mengambil data kelompok/item/tipe/spesifikasi dari Supabase, gambar dari `assets/catalog-images.json`, serta list revisi/assessment/Rencana label dari `assets/catalog.json`. Nama item dinormalisasi untuk mencocokkan katalog server dan file lokal. Artinya sumber lokal dan Supabase harus memiliki ID/nama yang konsisten; fallback pencocokan nama tidak aman untuk nama duplikat. Finalkan satu proses sinkronisasi katalog dan validasi sebelum form dibuka.

## 10. Model data Supabase saat ini

Migrasi lokal membuat/menggunakan tabel berikut. Tabel sumber induk `index_kdkmp_lahat`, `manager`, dan `pengurus` diasumsikan sudah ada sebelumnya; migrasi proyek ini tidak mendefinisikan ulang tabel induk tersebut.

| Tabel | Fungsi dan kolom penting | Catatan implementasi |
|---|---|---|
| `public.sarpras_kelompok` | Master grup: `kelompok_id`, nama, urutan, aktif. | Urutan unik; ID wajib membedakan dua grup dengan label sama. |
| `public.sarpras_katalog` | Master item: `item_id`, `induk_item_id`, grup, nama, urutan, `jumlah_rencana integer`, tipe/spec/gambar JSON, aktif. | PK item; unique grup+urutan. Kolom integer tidak memelihara label rentang secara utuh; app saat ini mengandalkan label di JSON lokal. |
| `public.sarpras_isian_kelompok` | Isian grup per NIK, status awal, versi, waktu perubahan. | PK NIK+grup; nilai `custom` dipakai UI sebagai Sebagian. |
| `public.sarpras_isian` | Satu baris per NIK+item: tipe, keberadaan, kondisi scalar kompatibilitas, jumlah aktual, jumlah rusak, catatan, `detail jsonb`, `lampiran jsonb`, versi, waktu/editor. | Unique NIK+item; constraint count dan condition sederhana. Allocation kondisi baru disimpan di `detail` dan belum divalidasi penuh di database. Schema catatan 800 setelah migration rule lokal; migration dasar awal memberi batas 1000. |
| `public.log_aktivitas` | Log waktu server, role/NIK, jenis tindakan, entitas, kunci, sebelum/sesudah JSON. | RPC simpan saat ini hanya menulis ringkasan jumlah baris/grup; tidak mencatat perubahan field sebelum/sesudah atau ekspor. |
| `private.app_user_passwords` | Hash password per akun dengan primary key `(role,user_key)`. | 2 PMO (`1111`,`2222`), 377 Manager (NIK), 377 Pengurus (NIK), dan 1 Tamu. Hash awal diwarisi per role untuk transisi; sesudah rotasi tiap hash terpisah. |
| `private.app_sessions` | Hash token sesi, role, NIK, waktu kedaluwarsa. | Token sesi mentah dikembalikan hanya saat login; durasi 12 jam. Belum ada RPC pencabutan sesi yang tampak pada source. |

### RPC utama

- `kdmp_login`: verifikasi PIN, role, NIK/identitas; membuat token acak dan menyimpan hash token.
- `kdmp_check`: memeriksa token dan expiry.
- `kdmp_list_coops` / `kdmp_coop_picker`: mengembalikan direktori koperasi.
- `kdmp_load_form`: mengambil nilai grup/item; Manager/Pengurus dapat membaca koperasi lain; Guest membaca koperasi yang dipilih.
- `kdmp_save_form`: menolak Guest, mengecek batas NIK bagi Manager/Pengurus, menulis semua rows/grup dengan version check dan satu transaksi, lalu menambah satu log simpan.
- `kdmp_dashboard`: mengagregasi progres, status, dan prioritas berdasarkan kolom item yang disimpan.

Sebagian besar fungsi database bersifat `SECURITY DEFINER`, memakai `search_path=''`, dibungkus fungsi `public` `SECURITY INVOKER`, serta diizinkan melalui grant RPC. RLS aktif pada tabel-tabel data; tabel katalog memiliki kebijakan baca publik yang eksplisit. Data form tidak dirancang untuk akses tulis langsung oleh browser; penulisan dilakukan melalui RPC.

## 11. Yang sudah baik dan dapat dipertahankan

- Bentuk data umum satu baris isian per kombinasi NIK/item menghindari tabel dan kolom khusus untuk masing-masing item.
- Primary/unique keys pada katalog/isian membantu mencegah ID item berulang di database dan duplikasi isian server.
- Ada pemisahan tabel katalog, data isian, penilaian grup, sesi, PIN hash, dan aktivitas.
- RLS dinyalakan di tabel data; akses katalog publik diatur read-only; jalur form diarahkan melalui fungsi RPC terbatas.
- Fungsi sensitif memakai token acak yang disimpan dalam bentuk hash, masa berlaku sesi, validasi role, `SECURITY DEFINER` dengan search path kosong, dan pembatasan hak save Manager/Pengurus.
- Simpan form dirancang atomik dan versioned; konflik versi menghasilkan penolakan, bukan silent overwrite.
- Frontend meloloskan teks dinamis sebelum memasukkannya ke HTML; rincian spesifikasi ditampilkan melalui `textContent`.
- Draft localStorage dipisah berdasar NIK/form, tidak memuat PIN atau token, dan draft baru dihapus setelah respons simpan sukses.
- Aplikasi memakai publishable Supabase key yang memang dapat berada di browser; di `supabase-config.js` terdapat larangan eksplisit memasukkan service-role key/password.
- Aset gambar lokal sudah punya rujukan file yang lengkap secara teknis pada audit direktori saat ini: tidak ada path yang hilang.

Ini adalah kekuatan source code; belum merupakan audit keamanan produksi. RLS, grants, konfigurasi proyek Supabase/Netlify, rahasia, dan urutan migration remote tetap perlu diverifikasi.

## 12. Kondisi implementasi: selesai, sebagian, dan belum aman dianggap selesai

| Area | Kondisi source lokal | Penilaian |
|---|---|---|
| Daftar Form B | 22 grup/96 item pada `assets/catalog.json` dan daftar revisi | Cocok untuk nama, urutan, rencana, assessment; audit terbaru 96/96 tanpa perbedaan. |
| Rencana tidak diketahui | 13 item bernilai `—` di daftar/katalog lokal | Sesuai keputusan; server `jumlah_rencana` harus null. |
| Status sumber air | Tidak ada Permanen/Sementara di assessment atau form khusus; key lawas dibuang | Sesuai keputusan terbaru. Pastikan versi browser/server mengambil source terbaru. |
| Rencana di form | Dibuat sebagai label read-only untuk semua item; label kosong fallback `—` | Sesuai tujuan. Nilai numeric diambil dari angka pertama label untuk status kurang dari rencana. |
| Field assessment dinamis | `app.js` memuat `assessment` dari JSON lokal | Ada. Perlu audit visual/fungsional tiap 96 baris setelah desain baru, bukan mengandalkan browser lama. |
| Kondisi dan jumlah | Radio target 1, checkbox untuk beberapa kondisi, jumlah default 0, actual sum | Logika ada di frontend; belum selaras dengan agregasi dashboard/validasi server/ekspor. |
| Default Keberadaan | Load form mengisi record kosong dengan Tidak Ada | Sesuai dokumen revisi. Perhatikan dampak pada makna “sudah dinilai” dan statistik ketika seluruh form disimpan. |
| Sumber data katalog | Lokal + Supabase + image map order-based | Berjalan secara struktur, tetapi rentan drift, nama ganda, atau ID ganda. |
| Group/item IDs | Ada ID item duplikat di catalog JSON | **Blocker integritas.** Lihat 13.1. |
| Ringkasan dashboard | SQL masih menghitung kondisi dari kolom scalar `kondisi` | **Tidak lengkap untuk kondisi campuran dalam `detail.kondisi_jumlah`.** |
| Export detail | Implementasi CSV ada | Header dan jumlah/urutan kolom tidak cocok dengan row data; perlu perbaikan sebelum dipercaya. |
| Log | Tabel/RPC catat save event | Belum merupakan audit rinci; export tidak tercatat dan before/after kosong pada event simpan. |
| UI | HTML/CSS/JS sudah ada | Pemilik menyatakan desain saat ini sangat buruk dan ingin AI berikut merancang UI dari awal. Jangan anggap UI disetujui. |
| Keamanan remote | Migrasi lokal menunjukkan kontrol yang diniatkan | Belum dapat dipastikan migrasi/RLS/grants remote sudah sama atau benar. |
| Migrasi | Source mencakup migrasi data/fitur | Ada dua file dengan versi awalan `202611150009`; perlu diselesaikan sebelum CLI/penerapan. |

## 13. Masalah dan tindak lanjut prioritas

### 13.1 P0 — identitas item ganda, berisiko merusak isian

Dalam `assets/catalog.json`, item nomor 35 **Laci Dorong** (Furniture Gerai) dan nomor 40 **Laci Dorong** (Perlengkapan Klinik) sama-sama memakai ID `GRY_LACI_DORONG`. State frontend menggunakan ID sebagai kunci `state.form.items[item.id]`, database memakai `item_id` sebagai primary/unique key, dan save mengirim semua item. Akibatnya dua baris dapat berbagi draft, tertimpa, tidak dapat dipisahkan dalam database, atau membuat satu insert/upsert berulang gagal.

**Tindak lanjut:** pemilik/pengelola data harus menentukan ID stabil unik untuk laci klinik, memeriksa ID lama yang sudah ada, memetakan data per NIK sebelum migrasi, lalu membetulkan JSON, seed/migration, gambar, export, dan data server secara konsisten. Jangan mengubah ID produksi hanya berdasarkan tebakan nama.

### 13.2 P0 — dua migration memiliki versi sama

Ada `202611150009_revised_assessment_rules.sql` dan `202611150009_return_profile_names.sql`. Jika Supabase CLI membaca awalan timestamp sebagai version, dua migration mempunyai versi yang sama.

**Tindak lanjut:** bandingkan `supabase migration list`/riwayat remote dengan file lokal, tentukan apakah salah satu sudah pernah diterapkan, beri version timestamp unik pada migration yang belum diterapkan, dan verifikasi urutan/rollback sebelum deploy. Jangan menjalankan migration secara buta.

### 13.3 P1 — mapping fallback grup ambigu

Ada dua label grup `Perlengkapan Lain`, tetapi ID lokalnya berbeda. `loadCatalog()` lebih dulu cocok dengan ID yang ada di server lalu fallback ke nama grup ternormalisasi. Bila ID tidak tersedia, fallback berdasarkan nama yang sama dapat mengarahkan kedua grup ke satu ID database.

**Tindak lanjut:** sinkronkan semua group ID yang stabil, jangan gunakan nama tidak unik sebagai fallback, pastikan satu-to-satu group mapping, dan pastikan save payload tidak berisi duplikat `kelompok_id`.

### 13.4 P1 — ringkasan belum membaca alokasi kondisi baru

Frontend menyimpan alokasi kondisi dalam `detail.kondisi_jumlah` dan pilihan di `detail.kondisi_pilihan`. Untuk alokasi campuran, `serializeRows()` mengosongkan `kondisi` scalar karena tidak ada satu kondisi tunggal. RPC `kdmp_dashboard` lokal masih menghitung `items_unchecked` dari `x.kondisi='belum_dicek'`, `items_damaged` terutama dari scalar/jumlah rusak, dan `items_ready` dari scalar `kondisi='baik'`.

Akibatnya campuran Baik+Belum dicek dapat tidak masuk agregat belum dicek; beberapa ringkasan dapat tidak sejalan dengan Form. `jumlah_rusak` membantu sebagian hitung Rusak tetapi bukan sumber tunggal yang aman untuk semua status.

**Tindak lanjut:** ubah query dashboard agar membaca alokasi JSON tervalidasi, definisikan item siap berdasarkan alokasi penuh (semua unit Baik/Berfungsi dan jumlah target terpenuhi), kemudian cocokan summary, filter, jumlah prioritas, dan ekspor. Sediakan kompatibilitas/migrasi data scalar lama tanpa menebak distribusi kondisi yang tidak tercatat.

### 13.5 P1 — export detail CSV salah jumlah/mapping kolom

`app.js` menghasilkan row detail dengan 15 nilai, sedangkan header memiliki 17 kolom dan mengiklankan kolom Jumlah Baik/Berfungsi, Rusak, dan Belum dicek yang belum diisi dari sumber masing-masing. Row saat ini menempatkan `row.jumlah_rusak` tepat setelah jumlah aktual, sehingga secara posisi masuk ke kolom “Jumlah Baik/Berfungsi”; kolom berikutnya juga bergeser. Selain itu `detail` JSON mentah tidak menggantikan kolom breakdown terpisah.

**Tindak lanjut:** buat kontrak header dan row yang sama panjang, baca alokasi dari JSON, tampilkan rencana label utuh, dan uji buka hasil di Excel/LibreOffice. Pastikan format final CSV vs `.xlsx` disetujui.

### 13.6 P1 — validasi server belum melindungi JSON kondisi

Constraint SQL membatasi `jumlah_aktual`/`jumlah_rusak` scalar, tetapi tidak memvalidasi isi `detail.kondisi_jumlah`, total alokasi, konsistensi `jumlah_aktual`, pilihan kondisi, atau catatan. Validasi di browser dapat dilewati dengan panggilan RPC langsung.

**Tindak lanjut:** tambahkan validasi pada RPC/constraint yang sesuai: setiap alokasi integer nonnegatif; total sesuai derived actual; pilihan dan jumlah konsisten; nilai kosong/tidak berlaku ditangani; Rusak berasal dari alokasi Rusak; Keberadaan Tidak Ada tidak menyisakan rincian aktif. Tetap mengikuti keputusan bahwa kolom kosong tidak memblokir simpan dan catatan Rusak adalah pengingat, bukan blocker.

### 13.7 P1 — perubahan status grup dapat menghapus draft rinci tanpa konfirmasi

Perubahan Keberadaan individual dari Ada ke Tidak Ada meminta konfirmasi jika ada jumlah/kondisi. Handler status grup massal mengosongkan data rinci saat memilih Tidak Ada tanpa meminta konfirmasi peringatan/undo.

**Tindak lanjut:** desain ulang alur mass-fill agar ringkasan dampak terlihat, item yang memiliki data tidak hilang diam-diam, dan pengguna dapat membatalkan sebelum perubahan disimpan. Perubahan harus tetap masuk draft sampai Simpan eksplisit.

### 13.8 P1 — kesesuaian katalog lokal dan server belum dapat dibuktikan

Aplikasi memakai assessment/Rencana dari JSON lokal, namun tipe/spesifikasi/nama/kelompok dari Supabase. Migration katalog 96 item ada di source lokal tetapi penerapannya belum diverifikasi. Duplikasi nama dan ID dapat menyebabkan fallback yang salah.

**Tindak lanjut:** buat audit sinkronisasi yang membandingkan item/group ID, nama, order, target, tipe, spesifikasi, dan status aktif; hasilkan laporan mismatch; baru sesudahnya putuskan perubahan SQL.

### 13.9 P2 — spesifikasi rencana berbentuk rentang

Kolom DB `jumlah_rencana` integer tidak dapat menyimpan `10–12` atau `12–16` sebagai satu range. Local JS mengambil angka pertama sebagai threshold minimum. Kebijakan upper bound dan perbandingan status belum didefinisikan lintas app/database/export.

**Tindak lanjut:** putuskan apakah model data perlu `target_min`, `target_max`, `rencana_label`, dan unit; pertahankan label tampilan persis dari acuan. Jangan merusak urutan/ID saat mengubah model.

### 13.10 P2 — panjang catatan dan format export

UI/katalog terbaru menetapkan 800 karakter dan migration revisi membatasi database ke 800; migration dasar lama menyebut 1.000. Pastikan constraint aktif di remote. Rancangan awal menyebut Excel, sedangkan aplikasi sekarang menghasilkan CSV.

**Tindak lanjut:** verifikasi batas remote, pertahankan batas 800 di frontend/server, tetapkan format output dan catatan integritas export, serta implementasikan logging export.

### 13.11 P2 — gambar serta daftar aset

Pemetaan saat ini memakai nomor item/order, bukan ID item, sehingga perubahan urutan dapat menempelkan gambar yang salah. 176 gambar terpetakan; satu file `placeholder.jpg` tidak dipakai oleh mapping saat ini.

**Tindak lanjut:** validasi tiap file terhadap `LIST-ASET-GAMBAR-SARPRAS-POIN-B.md`; putuskan peran placeholder; pindahkan mapping ke item_id stabil; pastikan gambar varian dan spesifikasi cocok; jangan menampilkan gambar salah sebagai bukti.

### 13.12 P2 — ketahanan draft dan pemulihan

Draft lokal bekerja setelah aplikasi berhasil dimuat dan sessionStorage menyediakan konteks. Aplikasi tidak memiliki service worker/offline bundle yang tampak, sehingga login/muat ulang pertama kali saat offline belum dijamin. Simpan server manual; tidak ada sinkronisasi otomatis saat online.

**Tindak lanjut:** tentukan batas offline yang dibutuhkan, kebijakan retensi/local storage, pemulihan konflik, dan indikator status draft. Jangan menghapus local draft sebelum respons server sukses yang cocok dengan koperasi/form tersebut.

### 13.13 P1 — Ringkasan Manager/Pengurus dapat menampilkan angka nol palsu

RPC dashboard membatasi agregasi Manager/Pengurus ke koperasi NIK sendiri. Sesudah itu `loadDashboard()` mengisi direktori semua koperasi dan membuat statistik default nol untuk koperasi lain. Akibatnya kartu/daftar dapat menampilkan koperasi lain sebagai belum mulai dengan nol temuan, padahal statistiknya tidak dimuat. Ini bisa disalahartikan sebagai data aktual.

**Tindak lanjut:** tentukan apakah ringkasan role Manager/Pengurus hanya menampilkan koperasi sendiri atau boleh memuat agregat baca seluruh koperasi. Jangan mengisi nilai nol untuk data yang belum diambil; gunakan keadaan “tidak tersedia/tidak dalam cakupan” atau panggil agregasi baca yang memang diizinkan.

### 13.14 P1 — filter dan angka perhatian belum konsisten untuk alokasi campuran

`itemStats()` lokal membaca alokasi kondisi, tetapi filter item `Perlu perhatian` masih mengandalkan `v.condition` tunggal dan jumlah di bawah target; kombinasi Baik+Rusak atau Baik+Belum dicek dapat tidak terfilter sesuai isi. Angka perhatian dibentuk dengan menjumlahkan missing+damaged+unchecked+below, sehingga satu item bisa dihitung lebih dari sekali bila ada beberapa temuan.

**Tindak lanjut:** definisikan apakah ringkasan menampilkan jumlah item unik, jumlah temuan, atau keduanya. Samakan filter dan angka lokal/server dengan rincian `kondisi_jumlah` yang sama.

## 14. Keamanan, privasi, dan integritas

### Kekuatan yang terlihat

- RLS diaktifkan pada tabel sarpras dan log dalam migrasi dasar; tabel katalog diberi kebijakan baca publik eksplisit.
- RPC menempatkan operasi simpan di server, memakai token custom yang hash-nya disimpan, masa berlaku 12 jam, role checks, dan scope tulis per NIK untuk Manager/Pengurus.
- Guest tidak dapat menyimpan melalui RPC.
- PIN tidak disimpan dalam local draft; `supabase-config.js` mengiklankan publishable key, bukan service-role key.
- Escape HTML di frontend dan penggunaan text node untuk detail membantu mengurangi injeksi markup.

### Batasan/risiko yang wajib diaudit

- Hash password awal seeded di database berasal dari hash awal role sebelumnya, kemudian dipisah per identitas. Jangan menampilkan password maupun hash pada dokumen/issue. Prosedur reset tetap diperlukan karena password asli tidak dapat dibaca dari hash.
- Session token berada di `sessionStorage`, dapat dibaca JavaScript pada origin yang sama, dan logout lokal tidak mencabut sesi server; sesi berlaku hingga expiry 12 jam.
- RPC picker tanpa token mengembalikan direktori koperasi, sedangkan beberapa list/RPC juga tersedia untuk sesi; pastikan publikasi data koperasi tersebut memang diizinkan.
- Tabel dan fungsi remote belum diaudit langsung; status RLS/grants remote, extension bcrypt/crypto, dan hak owner/role Supabase tidak diketahui dari source saja.
- Pembatasan percobaan PIN, rotasi sesi, revocation, rate limit, alert, dan backup tidak terlihat lengkap.
- Validasi kondisi alokasi belum di server, sehingga data JSON yang tidak konsisten dapat masuk melalui RPC.
- Audit log saat ini tidak lengkap untuk kebutuhan “before/after” dan ekspor; tidak boleh disebut audit lengkap.
- Tidak ditemukan konfigurasi Netlify/header keamanan lokal di inventaris root. Jangan klaim header produksi sudah terpasang.
- Jangan mengirim service-role key, password DB, PIN, token, atau data personal dalam frontend, PRD, log debug, maupun commit.

## 15. Persyaratan nonfungsional

- **Akurasi:** tidak menebak data aktual; `—`, null, nol, Tidak Ada, dan belum dinilai dibedakan dengan benar.
- **Integritas:** unique ID per grup/item, konsistensi JSON kondisi, transaksi atomic, version conflict, dan format ekspor yang dapat diverifikasi.
- **Keamanan:** least privilege; cek akses untuk setiap RPC; RLS/grants ditinjau; tidak ada secret server-side di browser.
- **Ketahanan:** draft tetap ada saat offline/save failure; indicator server sukses hanya setelah konfirmasi server; ada prosedur backup/restore.
- **Aksesibilitas:** keyboard, label kontrol, fokus terlihat, pembaca layar, kontras cukup, dan tidak mengandalkan warna saja. Detail visual diserahkan ke AI UI.
- **Kinerja:** katalog dan gambar dimuat seperlunya; hindari mengirim/merender image berat tanpa permintaan. Tetapkan target response time dan perangkat uji sebelum rilis.
- **Auditabilitas:** perubahan data dan ekspor dicatat oleh server dengan cakupan yang sesuai kebijakan privasi.
- **Pemeliharaan:** source katalog tunggal atau pemeriksaan otomatis drift yang jelas; migration unik dan terdokumentasi; ada prosedur deploy/rollback.

## 16. Kriteria penerimaan produk

### Katalog dan Rencana

- Form menampilkan semua 22 grup dan 96 item dengan urutan/label sumber revisi.
- Setiap item menampilkan Rencana; nilai tak diketahui tampak `—`, tidak menjadi `0`.
- Nama/urutan/Rencana/assessment JSON cocok ke daftar utama; item dan grup memiliki ID unik.
- Tidak ada pilihan Permanen/Sementara pada Sumber air.

### Kondisi dan jumlah

- Item ber-Rencana tepat satu dan berkondisi memakai single-choice; nilai 1 berada hanya pada kondisi terpilih; kondisi lain 0; Jumlah aktual berubah otomatis.
- Item multikuantitas dapat membagi unit ke kondisi sesuai jumlah faktual; semua input kuantitas mulai dari 0.
- Jumlah aktual condition-based merupakan total alokasi; tidak disalin dari rencana.
- Item Struk/Thermal Label memakai input kuantitas aktual default 0 dan Ketersediaan, tanpa alokasi kondisi.
- Alokasi, total aktual, scalar kompatibilitas, dashboard, dan CSV/XLSX konsisten untuk campuran kondisi.
- Catatan maksimal 800 karakter; Rusak memberi pengingat tetapi catatan kosong tidak memblokir simpan.

### Penyimpanan, akses, dan data

- Manager/Pengurus dapat membaca koperasi lain namun RPC menolak save lintas-NIK; PMO dapat save seluruh cakupan; Guest tidak dapat save.
- Semua row form disimpan atomik; konflik versi ditampilkan dan tidak menghilangkan draft.
- Perubahan kelompok tidak membuang rincian tanpa pengguna mengetahui dan dapat membatalkannya.
- Katalog server tidak mengandung ID duplikat, dua grup bernama sama tetap terpisah, dan 96 item dapat disimpan sebagai record berbeda.
- Draft lokal tidak mencakup PIN/token dan hanya dihapus setelah save berhasil.
- Ekspor memiliki header dan row dengan jumlah kolom sama, angka alokasi benar, format final disepakati, dan event tercatat di log.
- Setelah deployment, verifikasi RLS/grants/migrations remote dan backup; hasil remote harus dicatat secara terpisah dari source review.

## 17. Tahapan kerja untuk AI berikutnya

### Tahap A — audit dan perbaikan integritas sebelum UI

1. Baca PRD ini dan seluruh `LIST-GRUP-ITEM-RENCANA-PENILAIAN-REVISI.md`.
2. Audit local JSON, seed SQL, migration, image map, dan remote catalogue dalam read-only; laporkan mismatch tanpa menyentuh data produksi.
3. Minta/ambil keputusan ID unik untuk Laci Dorong item 40 dan periksa dua grup Perlengkapan Lain.
4. Selesaikan duplikasi version migration 009 sesuai histori remote.
5. Rancang schema/RPC yang dapat memvalidasi rincian kondisi dan mendukung agregasi benar; petakan data lama tanpa menebak.
6. Betulkan CSV detail atau sepakati XLSX, serta tambahkan audit ekspor bila tetap wajib.

### Tahap B — desain UI baru

AI baru membuat rancangan visual dan alur layar dari awal. Minta pemilik proyek menilai desain yang konkret sebelum implementasi luas. Jangan mengubah definisi field/katalog ketika hanya mengubah UI. Jaga desktop/mobile, akses keyboard, dan pesan status draft/server.

### Tahap C — implementasi dan kesiapan rilis

- Implementasikan katalog dan ID stabil, backend validation, agregat, form, dan ekspor secara berurutan.
- Migrasi dilakukan di lingkungan pengujian dengan backup; sertakan validasi hasil dan rencana rollback.
- Baru klaim sinkron/rilis setelah remote migration, otorisasi, data, dan alur diperiksa. Browser pemilik proyek tidak boleh diambil alih; minta pemilik menjalankan preview jika perlu pengamatan UI.

## 18. Daftar keputusan yang masih perlu pemilik proyek

1. Tetapkan ID permanen berbeda untuk item 40 Laci Dorong Klinik setelah audit data existing.
2. Konfirmasi label/kelompok final untuk dua grup Perlengkapan Lain dan ID server-nya.
3. Untuk Rencana rentang, apakah kekurangan dihitung terhadap batas minimum saja atau rentang penuh; apakah kelebihan juga ditandai?
4. Apakah jumlah aktual 0 saat keberadaan Ada boleh disimpan tanpa peringatan, atau harus ada pengingat tambahan? Acuan melarang menyimpulkan Tidak Ada dari angka 0.
5. Konfirmasi format export akhir: CSV yang sekarang ada atau Excel `.xlsx` sesuai rancangan lama.
6. Konfirmasi apakah logging export dan perubahan nilai sebelum/sesudah tetap wajib, dan siapa yang dapat meninjau audit.
7. Validasi daftar daya VA MCB dan apakah `Lainnya` memerlukan satuan eksplisit.
8. Konfirmasi pemaknaan dua nilai PMO yang sudah ada di migration; jangan ganti identitas tanpa pemilik.
9. Pastikan jumlah koperasi terbaru memang 377 dan validasi data induk Manager/Pengurus dengan sumber resmi.
10. Tentukan kebutuhan offline: draft yang hanya aman sesudah form dimuat atau kemampuan membuka aplikasi/form offline penuh.
11. Tetapkan retensi data lokal, sesi server, backup, target availability, monitor error, dan owner operasional.

## Appendix A — acuan lengkap 96 item

Tabel per item berisi ID, Rencana, dan string Penilaian yang dipakai runtime dibuat dari `assets/catalog.json` di bawah setelah bagian utama dokumen ini. Sumber normatif yang harus dibuka bersama tabel tersebut adalah `perencanaan/LIST-GRUP-ITEM-RENCANA-PENILAIAN-REVISI.md`. Perbedaan antara keduanya adalah bug katalog dan harus dilaporkan sebelum implementasi.

| Grup | No. | Nama item | Item ID | Rencana | Penilaian |
|---|---:|---|---|---|---|
| Kendaraan | 1 | Truk 6 ban bak kayu/besi | KDN_TRUK | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Kendaraan | 2 | Kendaraan pick-up 4WD (4x4) | KDN_PICKUP | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Kendaraan | 3 | Motor bak roda 3 | KDN_MOTOR_RODA3 | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 4 | POS (Point of Sales) | OPS_KASIR_POS | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 5 | Cash Drawer | OPS_KASIR_CASH_DRAWER | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 6 | Gun Scanner | OPS_KASIR_GUN_SCANNER | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 7 | Finger Print | OPS_KASIR_FINGERPRINT | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 8 | Printer Receipt | OPS_KASIR_PRINTER_RECEIPT | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 9 | Printer Barcode | OPS_KASIR_PRINTER_BARCODE | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 10 | EDC | OPS_KASIR_EDC | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 11 | WiFi Router/Modem | OPS_KASIR_ROUTER | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set Mesin Kasir | 12 | UPS | OPS_KASIR_UPS | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 13 | IP Camera Indoor | KMN_CCTV_IPCAM_INDOOR | 4 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 14 | IP Camera Outdoor | KMN_CCTV_IPCAM_OUTDOOR | 4 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 15 | NVR 8 Channel | KMN_CCTV_NVR | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 16 | POE Switch 10 Port | KMN_CCTV_POE_SWITCH | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 17 | HDD Minimal 2 TB | KMN_CCTV_HDD | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 18 | Kabel LAN Cat 6 | KMN_CCTV_KABEL_LAN | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 19 | LED Display 19 Inch | KMN_CCTV_LED_DISPLAY | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 20 | Wallmount Rack Server 4U | KMN_CCTV_RACK | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 21 | Connector RJ45 Belden Cat 5 | KMN_CCTV_RJ45 | 20 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 22 | Stop Kontak 6 Slot | KMN_CCTV_STOP_KONTAK | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 23 | Pipa PVC 20 mm | KMN_CCTV_PIPA_PVC | 35 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 24 | Sok Pipa | KMN_CCTV_SOK_PIPA | 35 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 25 | Kabel Duct 40 x 25 mm (1 batang = 3 m) | KMN_CCTV_KABEL_DUCT | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 26 | Kabel Ties 20 cm | KMN_CCTV_KABEL_TIES | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 27 | Isolasi Listrik | KMN_CCTV_ISOLASI | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 28 | Kabel HDMI 1,5 m | KMN_CCTV_KABEL_HDMI | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| 1 Set CCTV | 29 | Double Tape 3M | KMN_CCTV_DOUBLE_TAPE | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Konektivitas & Software | 30 | Internet | GRY_INTERNET | 1 layanan | Keberadaan; Jenis koneksi; Status berfungsi; Catatan |
| Konektivitas & Software | 31 | Perangkat Lunak Kasir (Software KDKMP) | GRY_SOFTWARE_KASIR | 1 paket | Keberadaan; Status berfungsi; Catatan |
| Air Conditioner | 32 | AC 2 PK | GRY_AC_2PK | 3 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Air Conditioner | 33 | AC 1 PK | GRY_AC_1PK | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Furniture Gerai | 34 | Meja Koperasi Simpan Pinjam | GRY_MEJA_KOPERASI | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Furniture Gerai | 35 | Laci Dorong | GRY_LACI_DORONG | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Furniture Gerai | 36 | Rak Etalase | GRY_RAK_ETALASE | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Furniture Gerai | 37 | Meja Kasir | GRY_MEJA_KASIR | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Apotek | 38 | Lemari Display Apotek | GRY_LEMARI_DISPLAY_APOTEK | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Klinik | 39 | Meja Administrasi Klinik | GRY_KLINIK_MEJA_ADMINISTRASI | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Klinik | 40 | Laci Dorong | GRY_LACI_DORONG | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Klinik | 41 | Kursi (10 Unit) | GRY_KLINIK_KURSI | 10 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Klinik | 42 | Meja Dokter | GRY_KLINIK_MEJA_DOKTER | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Klinik | 43 | Tempat Tidur Periksa Pasien | GRY_KLINIK_TEMPAT_TIDUR | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Rak Gerai | 44 | Rak Display Single/Wall/Pinggir 90x40x180 cm | GRY_RAK_WALL | 11 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Rak Gerai | 45 | Rak Display Double/Island/Tengah 90x80x150 cm | GRY_RAK_ISLAND | 24 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Rak Gerai | 46 | Rak Display End 80x40x150 cm | GRY_RAK_END | 6 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| APAR | 47 | APAR 3 kg | KMN_APAR_3KG | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| APAR | 48 | APAR 9 kg | KMN_APAR_9KG | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Keranjang Belanja | 49 | Keranjang Tarik | GRY_KERANJANG_TARIK | 20 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Keranjang Belanja | 50 | Keranjang Jinjing | GRY_KERANJANG_JINJING | 20 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Seragam KDKMP | 51 | Kemeja | OPS_SERAGAM_KEMEJA | 18 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Seragam KDKMP | 52 | Kaos Polo | OPS_SERAGAM_KAOS_POLO | 36 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Lain | 53 | Pallet | OPS_PALLET | 25 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Lain | 54 | Printer | OPS_PRINTER | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Lain | 55 | Brankas | KMN_BRANKAS | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Lain | 56 | Genset | KMN_GENSET | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| ATK | 57 | Stempel | OPS_STEMPEL | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| ATK | 58 | Struk | OPS_STRUK | 20 unit | Keberadaan; Jumlah aktual; Ketersediaan; Catatan |
| ATK | 59 | Thermal Label | OPS_THERMAL_LABEL | 5 unit | Keberadaan; Jumlah aktual; Ketersediaan; Catatan |
| Alat Kebersihan | 60 | Tempat Sampah Besar | OPS_TEMPAT_SAMPAH | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Alat Kebersihan | 61 | Alat Pel dan Ember | OPS_ALAT_PEL | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Alat Kebersihan | 62 | Sapu Lantai dan Pengki | OPS_SAPU_PENGKI | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Komputer | 63 | PC All in One Intel, RAM 8 GB, SSD 512 GB | GRY_KOMPUTER_AIO | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Beverages & Frozen Foods | 64 | Chiller 1 Pintu (2 Unit) | GRY_CHILLER | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Beverages & Frozen Foods | 65 | Chest Freezer Kapasitas sekitar 680 Liter | GRY_FREEZER | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Ventilasi | 66 | Kipas Plafon | GRY_KIPAS_PLAFON | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Ventilasi | 67 | Exhaust Fan | GRY_EXHAUST_FAN | 2 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Perlengkapan Lain | 68 | Loker Lemari | OPS_LOKER_LEMARI | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Keamanan & Kehadiran | 69 | Alarm Toko | KMN_ALARM_TOKO | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Keamanan & Kehadiran | 70 | Mesin Absensi | KMN_MESIN_ABSENSI | 1 unit | Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan |
| Instalasi Air | 71 | Sumber air | OPS_SUMBER_AIR | — | Keberadaan; Jenis sumber air; Terhubung ke instalasi; Catatan |
| Instalasi Air | 72 | Pompa air | OPS_POMPA_AIR | — | Keberadaan; Fungsi; Kondisi; Jumlah; Catatan |
| Instalasi Air | 73 | Keran air | OPS_KERAN_AIR | 3 unit | Keberadaan; Aliran air; Kondisi; Jumlah; Catatan |
| Instalasi Air | 74 | Wastafel klinik | OPS_WASTAFEL_KLINIK | 1 unit | Keberadaan; Aliran air; Kondisi; Jumlah; Catatan |
| Instalasi Air | 75 | Wastafel gudang | OPS_WASTAFEL_GUDANG | 1 unit | Keberadaan; Aliran air; Kondisi; Jumlah; Catatan |
| Instalasi Air | 76 | WC klinik | OPS_WC_KLINIK | 1 unit | Keberadaan; Tipe WC; Bidet; Terhubung septic tank; Kondisi; Jumlah; Catatan |
| Instalasi Air | 77 | WC gudang | OPS_WC_GUDANG | 2 unit | Keberadaan; Tipe WC; Bidet; Terhubung septic tank; Kondisi; Jumlah; Catatan |
| Instalasi Air | 78 | Septic tank | OPS_SEPTIC_TANK | — | Keberadaan; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 79 | Instalasi listrik | OPS_INSTALASI_LISTRIK | — | Keberadaan; Kelayakan; Letak posisi; Catatan |
| Instalasi Listrik | 80 | Sertifikat Laik Operasi (SLO) | OPS_SLO | — | Keberadaan; Catatan |
| Instalasi Listrik | 81 | Sumber listrik | OPS_SUMBER_LISTRIK | — | Keberadaan; Catatan |
| Instalasi Listrik | 82 | MCB | OPS_MCB | — | Keberadaan; Daya terpasang; Kondisi; Catatan |
| Instalasi Listrik | 83 | Panel listrik | OPS_PANEL_LISTRIK | — | Keberadaan; Letak posisi; Kondisi; Catatan |
| Instalasi Listrik | 84 | Lampu area bongkar muat | OPS_LAMPU_BONGKAR_MUAT | 1 unit | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 85 | Lampu gantung gudang utama | OPS_LAMPU_GANTUNG_GUDANG | 10–12 unit | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 86 | Lampu gudang pupuk | OPS_LAMPU_GUDANG_PUPUK | 2 unit | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 87 | Lampu gudang tabung gas (LPG) | OPS_LAMPU_GUDANG_LPG | 4 unit | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 88 | Lampu toilet gudang utama | OPS_LAMPU_TOILET_GUDANG | 2 unit (masing-masing 1) | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 89 | Lampu swalayan | OPS_LAMPU_SWALAYAN | 12–16 unit | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 90 | Lampu klinik | OPS_LAMPU_KLINIK | 2 unit | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 91 | Lampu teras depan swalayan (teras gerai) | OPS_LAMPU_TERAS_SWALAYAN | 6 unit | Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 92 | Colokan gudang utama | OPS_COLOKAN_GUDANG | — | Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 93 | Colokan gudang LPG | OPS_COLOKAN_LPG | — | Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 94 | Colokan gudang pupuk | OPS_COLOKAN_PUPUK | — | Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 95 | Colokan swalayan | OPS_COLOKAN_SWALAYAN | — | Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan |
| Instalasi Listrik | 96 | Colokan klinik | OPS_COLOKAN_KLINIK | — | Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan |

## Appendix B — daftar dokumen kerja

- `LIST-GRUP-ITEM-RENCANA-PENILAIAN-REVISI.md` — **acuan produk tertinggi untuk Form B**, 22 grup/96 item, Rencana dan assessment.
- `STRUKTUR-FORM-PENDATAAN-BARU.docx` — tambahan terbaru yang menyatakan aturan revisi menang; tetap baca dengan Bagian 2.2 PRD ini.
- `LIST-SARPRAS-POIN-B.md`, `LIST-SPEK-SARPRAS-POIN-B.md`, `LIST-ASET-GAMBAR-SARPRAS-POIN-B.md` — katalog lama, spesifikasi, dan daftar aset; gunakan sebagai bahan silang, bukan untuk mengubah daftar terbaru tanpa validasi.
- `STRUKTUR-FORM-PENDATAAN.md`, `PROMPT-LOGIKA-KONDISI-ITEM.md`, `arsip/PRD-Sistem-Pendataan-KDKMP-Lahat-V1-ARSIP.md` — **historis/superseded**. Beberapa aturannya bertentangan dengan keputusan terbaru.
- `Rancangan_Aplikasi_KDKMP_Lahat_Tersusun.docx`, `Catatan_Tambahan_KDKMP_Lahat_dari_Versi_GPT (1).docx` — pemikiran/rancangan awal dan keputusan lama; baca hanya untuk konteks yang tidak diganti.
- `UI-UX-3-Opsi-Dinamis.html`, `UI-UX-5-Konsep-KDKMP.html` — prototipe visual lama, bukan persetujuan UI.
- `assets/catalog.json`, `assets/catalog-images.json`, `assets/catalog-details*.json/sql`, `assets/catalog-seed.sql` — runtime/seed teknis; perlu direkonsiliasi ke acuan revisi.
- `supabase/migrations/*.sql` — riwayat skema yang dimaksudkan; cek riwayat remote sebelum menerapkan.

## Riwayat revisi

- **v2.0, 16 November 2026:** menyatukan keputusan revisi Form B, kondisi source code, skema/migrasi, temuan integritas, batas keamanan, prioritas sumber, dan agenda handoff. Mengoreksi dokumen lama yang menyebut Sumber air Permanen/Sementara serta angka Form B lama 70 baris.

## Keputusan terbaru pemilik — login, akun, dan katalog

Bagian ini mencatat keputusan terbaru pemilik dan mengesampingkan rancangan login lama di atas jika berbeda.

### Login dan kata sandi

1. **PMO:** pilih akun `PMO 1111` atau `PMO 2222`; tidak meminta NIK koperasi, kecamatan, atau desa.
2. **Tamu:** hanya mengisi PIN/kata sandi bersama untuk role Tamu; tidak meminta NIK atau wilayah. Akses tetap baca-saja.
3. **Manager/Pengurus:** login memakai role, NIK koperasi, dan PIN bersama untuk role tersebut. Hak edit tetap terbatas pada koperasi yang terkait dengan NIK.
4. Gunakan **akun per individu**: dua akun PMO (`1111`,`2222`), satu akun Manager dan satu Pengurus untuk tiap 377 NIK koperasi, dan satu akun Tamu. Password awal setiap akun memakai nilai awal role masing-masing; hash disimpan terpisah sehingga penggantian password hanya mengubah akun itu.
5. Pengguna mengganti password dari Profil dengan memasukkan password saat ini. Password minimum delapan karakter. Pergantian mengakhiri sesi untuk akun tersebut; password tidak dapat dibaca kembali oleh admin dan harus di-reset bila terlupa.
6. UI pilihan wilayah untuk Manager/Pengurus boleh membantu menemukan/mengisi NIK, tetapi bukan pengganti validasi NIK dan role oleh server. PMO dan Tamu tidak melihat pilihan wilayah.
7. Login lama dalam source menggunakan PIN bersama dan belum sama dengan rancangan UI baru. Bangun autentikasi database sesuai keputusan ini; jangan menganggap mockup sebagai autentikasi yang sudah berfungsi.

### Identitas katalog dan grup

- Nama “Laci Dorong” boleh muncul pada grup Gerai dan Klinik. Keduanya adalah isian aset yang berbeda, sehingga **item ID penyimpanan harus unik** (pertahankan ID Gerai yang lama; buat ID khusus untuk item Klinik) agar data tidak berbagi baris atau draft.
- Dua grup “Perlengkapan Lain” tetap terpisah karena posisi dan anggotanya berbeda. Pertahankan ID grup masing-masing; beri label UI yang membedakan konteks bila membantu navigasi, tanpa menggabungkan item.
- Ada dua migration lokal dengan timestamp `202611150009`. Solusi lokal: beri migration `revised_assessment_rules` timestamp unik sesudah `202611150009` (misalnya `202611150010`) dan sebelum migration tanggal 16 November. Ini hanya merapikan urutan file repository. **Jangan menerapkannya ke database remote** sebelum membandingkan catatan migration remote agar status yang sudah diterapkan tidak menjadi mismatch.

### Fokus tahap pembangunan

Prioritaskan login dan Form B sebagai alur utama. Ringkasan dan ekspor boleh dibuat sederhana terlebih dahulu, tetapi angka dan isi yang ditampilkan harus berasal dari data yang tersedia dan tidak boleh mengarang hasil. Keduanya dapat dikembangkan setelah pendataan berjalan.

Mockup login: `design-login.html` (prototipe visual; bukan sistem autentikasi aktif).
