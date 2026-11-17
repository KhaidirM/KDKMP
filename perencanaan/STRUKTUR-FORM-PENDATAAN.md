# Struktur dan Alur Form Pendataan Sarpras

> Dokumen kerja untuk menyepakati **struktur input dan perilaku Form B**. Edit bagian bertanda `EDIT` bila ingin mengubah rancangan. Jangan ubah ID katalog kecuali memang ada revisi sumber katalog. Dokumen ini adalah spesifikasi desain; perubahan di sini belum otomatis mengubah aplikasi atau database.

## 1. Acuan dan cakupan

- Sumber utama item, kelompok, urutan, target, dan ID: [`LIST-SARPRAS-POIN-B.md`](LIST-SARPRAS-POIN-B.md).
- Detail spesifikasi/varian: [`LIST-SPEK-SARPRAS-POIN-B.md`](LIST-SPEK-SARPRAS-POIN-B.md).
- Referensi perilaku tambahan: [`PRD-Sistem-Pendataan-KDKMP-Lahat.md`](PRD-Sistem-Pendataan-KDKMP-Lahat.md), terutama aturan khusus Sarpras.
- Form terdiri dari 70 item bernomor pada sumber Form B. Daftar item tidak diduplikasi di sini agar tidak muncul dua sumber urutan yang berbeda.
- Identitas koperasi dipilih sebelum form dibuka. Isi form dibaca dan disimpan terpisah per NIK koperasi.

## 2. Prinsip form

1. Tampilkan kelompok dalam keadaan terlipat. Pengguna membuka kelompok untuk melihat item.
2. Item memiliki urutan dan target sesuai sumber Form B. Target adalah acuan rencana, bukan jumlah aktual.
3. Bedakan **belum dinilai** (kosong) dari **Tidak Ada**.
4. Nilai kelompok membantu mengisi keberadaan item di dalamnya. Pengguna tetap dapat mengubah nilai tiap item setelahnya.
5. Setelah perubahan item, status kelompok dihitung ulang: semua Ada → `Ada`; semua Tidak Ada → `Tidak Ada`; campuran → `Sebagian`; belum lengkap → `Belum dinilai`/`Sebagian` (pilih salah satu pada keputusan terbuka di bawah).
6. Jumlah rusak hanya ditampilkan jika kondisi item `Rusak`. Nilainya bilangan bulat, minimal 0, tidak lebih dari jumlah aktual.
7. Isian koperasi lain untuk Manager/Pengurus hanya-baca. PMO dapat mengisi. Guest hanya-baca untuk semua koperasi.

## 3. Struktur input standar per item

| Urut | Field | Jenis kontrol | Pilihan / validasi | Tampil saat |
|---|---|---|---|---|
| 1 | Keberadaan | Pilihan | Belum dinilai, Ada, Tidak Ada | Selalu |
| 2 | Tipe / varian | Pilihan dari katalog | Opsi mengikuti item/varian; opsional jika tidak relevan | Item punya daftar tipe |
| 3 | Kondisi / fungsi | Pilihan | Baik/Berfungsi, Belum dicek, Rusak | Keberadaan Ada |
| 4 | Jumlah aktual | Bilangan bulat ≥ 0 | Opsional bila tidak relevan; validasi kebutuhan mengikuti item | Item berkuantitas dan Ada |
| 5 | Jumlah rusak | Bilangan bulat 0..jumlah aktual | Hanya jika kondisi Rusak | Kondisi Rusak |
| 6 | Detail khusus | Pilihan/teks/angka sesuai aturan khusus | Lihat bagian 5 | Item tertentu |
| 7 | Catatan lapangan | Teks hingga 1.000 karakter | Wajib/pengingat mengikuti kondisi khusus | Selalu tersedia |
| 8 | Gambar/spek | Tombol detail katalog | Buka gambar dan spesifikasi; tidak menjadi isian pendataan | Jika aset/spec tersedia |

## 4. Input tingkat kelompok

| Field | Pilihan | Perilaku |
|---|---|---|
| Status kelompok | Belum dinilai, Ada, Tidak Ada, Sebagian / khusus | Memilih Ada mengisi keberadaan semua item kelompok menjadi Ada. Memilih Tidak Ada mengisi semua menjadi Tidak Ada. Item dapat diubah manual. Sebagian / khusus tidak menimpa nilai item. |
| Indikator progres | Jumlah item dinilai dari total | Nomor kelompok: netral = belum dinilai, kuning = sebagian, hijau = seluruh item sudah dinilai. |
| Status kelompok otomatis | Ada, Tidak Ada, Sebagian / khusus, atau belum dinilai | Dihitung ulang setelah keberadaan item diedit. Aturan saat sebagian item masih kosong perlu dipastikan di keputusan terbuka. |

## 5. Aturan khusus item

### 5.1 Sumber air

- Keberadaan mengikuti field standar.
- Status rencana ditampilkan paling kiri pada detail khusus. Pilihan saat ini: `Permanen`, `Sementara`.
- Jenis sumber air: `Sumur bor`, `Sumur warga`, `Sumur desa`, `PAM desa`, `PAMSIMAS`, `Aliran sungai`, `Lainnya`.
- Jika keberadaan **Ada**: tampilkan apakah sumber terpasang/terhubung ke instalasi air.
- Jika keberadaan **Tidak Ada**: sembunyikan jenis sumber, jumlah aktual, dan jumlah rusak; tampilkan status rencana. Catatan lapangan ditandai wajib sebagai pengingat.

### 5.2 Pompa air

- Keberadaan dan jumlah aktual mengikuti standar.
- Kondisi menggunakan label `Fungsi`: `Berfungsi`, `Belum dicek`, `Rusak`.
- Jumlah rencana tidak perlu ditampilkan bila tidak tersedia pada Form B.
- Jika Rusak, jumlah rusak tampil dan catatan lapangan wajib.

### 5.3 Keran air

- Target mengikuti katalog (saat ini 3).
- Keberadaan, jumlah aktual, kondisi, dan aliran air (`Teraliri`, `Tidak teraliri`).
- Catatan selalu tersedia; wajib jika kondisi Rusak.

### 5.4 Wastafel

- Ikuti field standar.
- Tambahkan status aliran air: `Teraliri`, `Tidak teraliri`.
- Target dan tipe mengikuti katalog masing-masing item.

### 5.5 WC dan septic tank

- WC memiliki tipe `Jongkok`, `Duduk`, status bidet/jet washer (`Ada`, `Tidak ada`), serta status terhubung septic tank (`Ya`, `Tidak`).
- WC tidak dinilai dengan field aliran air.
- Septic tank dinilai Ada/Tidak Ada mengikuti field keberadaan.

### 5.6 Instalasi listrik

- Field: keberadaan; kelayakan (`Layak`, `Tidak layak`); SLO (`Ada`, `Tidak ada`); sumber listrik (`Ada`, `Tidak ada`); MCB (`Ada`, `Tidak ada`); daya terpasang; lokasi instalasi; keberadaan panel; lokasi panel.
- Daya terpasang adalah pilihan VA bertingkat. Daftar yang digunakan perlu mengikuti daya PLN yang relevan untuk lokasi dan kebutuhan KDKMP, serta menyediakan pilihan `Lainnya / daya PLN di luar daftar`.
- Lokasi instalasi/panel: `Dalam gudang utama`, `Luar gudang utama`.
- Catatan tambahan: **EDIT** aturan kapan detail instalasi disembunyikan jika keberadaan instalasi Tidak Ada.

### 5.7 Lampu

- Keberadaan, jumlah aktual, kondisi, aliran listrik (`Ya`, `Tidak`), dan status saklar (`Ada`, `Tidak ada`) bila berlaku pada item.
- Target berasal dari daftar Form B.

### 5.8 Item selain pengecualian di atas

- Gunakan field standar.
- Tipe/varian, jumlah rencana, dan spesifikasi bersumber dari katalog; jangan membuat pilihan yang tidak didukung data sumber tanpa menandainya sebagai keputusan baru.

## 6. Catatan dan validasi

- Kondisi Rusak: beri penanda merah yang jelas pada field catatan dan minta pengguna menjelaskan kerusakan.
- Catatan Rusak: apakah harus **menghalangi penyimpanan** bila kosong atau hanya peringatan? **EDIT keputusan.** Rancangan saat ini menganggap wajib sebelum Simpan.
- Sumber air Tidak Ada: catatan wajib menjelaskan rencana/alasan tindak lanjut.
- Keberadaan Tidak Ada: kondisi, jumlah aktual, dan jumlah rusak tidak relevan; sembunyikan dan jangan simpan nilai lama yang menyesatkan.
- Jumlah rusak tidak boleh lebih besar dari jumlah aktual.
- Isian kosong tidak otomatis berarti Tidak Ada.
- Perubahan kelompok yang bersifat massal perlu disimpan sebagai draft dan dapat dibatalkan sebelum pengguna menekan Simpan.

## 7. Alur pengguna

1. Pilih koperasi (atau masuk langsung ke koperasi akun sendiri untuk Manager/Pengurus).
2. Buka kelompok; kelompok tertutup secara default.
3. Isi status kelompok untuk isian cepat, atau isi item satu per satu.
4. Periksa item yang sudah diubah otomatis; ubah manual jika kondisi lapangan berbeda.
5. Lengkapi kondisi, kuantitas, detail khusus, dan catatan yang diminta.
6. Tinjau indikator kelengkapan/temuan.
7. Simpan draft ke server secara eksplisit. Tampilan saja tidak mengubah data tersimpan.

## 8. Hak akses form

| Peran | Lihat koperasi sendiri | Lihat koperasi lain | Edit koperasi sendiri | Edit koperasi lain |
|---|---:|---:|---:|---:|
| Manager | Ya | Ya, hanya-baca | Ya | Tidak |
| Pengurus | Ya | Ya, hanya-baca | Ya | Tidak |
| PMO | Ya | Ya | Ya | Ya |
| Guest | Ya | Ya | Tidak | Tidak |

## 9. Keputusan yang dapat Anda edit

Tulis keputusan final di sini agar saya menerapkannya konsisten pada UI, logika simpan/muat, dan database bila diperlukan.

- **Status kelompok bila ada item belum dinilai:** `Sebagian / khusus` atau tetap `Belum dinilai` — **EDIT**.
- **Catatan untuk item Rusak:** wajib menghalangi Simpan / hanya peringatan — **EDIT**.
- **Status rencana sumber air:** `Permanen` / `Sementara` / pilihan lain — **EDIT**.
- **Sumber air Tidak Ada:** apakah field rencana selalu tampil otomatis? — **EDIT**.
- **Daya PLN:** daftar daya final dan opsi di atas daya tertinggi — **EDIT**.
- **Instalasi listrik Tidak Ada:** detail mana yang tetap perlu dicatat? — **EDIT**.
- **Field lain atau urutan field:** **EDIT**.

## 10. Cara mengubah dokumen ini

Edit poin pada bagian 3–9 langsung. Untuk perubahan item, tuliskan **nomor Form B + nama item + field/perilaku baru** dan pastikan ID/target mengacu ke [`LIST-SARPRAS-POIN-B.md`](LIST-SARPRAS-POIN-B.md). Setelah Anda selesai, beri tahu saya bahwa dokumen siap diterapkan. Saya akan membandingkan perubahan dengan database saat ini dan mengusulkan migrasi jika bentuk data tersimpan ikut berubah.
