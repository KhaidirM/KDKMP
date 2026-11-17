# Prompt Desain — Logika Kondisi Item Sarpras

Gunakan isi dokumen ini sebagai prompt saat merancang atau mengubah interaksi kondisi item pada Form B. Dokumen ini menjelaskan **desain dan logika UI terlebih dahulu**. Jangan mengubah database, format API, atau proses simpan sebelum desain disetujui dan dampak skemanya dibahas.

## Prompt

Rancang ulang bagian **Kondisi** pada setiap item sarana-prasarana agar kondisi beberapa unit dalam satu item dapat dicatat dengan tepat. Pertahankan struktur kelompok, urutan Form B, target katalog, hak akses, serta alur simpan aplikasi yang sudah ada.

### 1. Pilihan kondisi

Gunakan tiga pilihan kondisi yang sama untuk semua item:

- **Baik**
- **Rusak**
- **Belum dicek**

Tampilkan sebagai pilihan interaktif yang mudah dipahami (misalnya chip/tombol pilihan). Jangan memakai dropdown kondisi umum untuk pola ini.

### 2. Perilaku berdasarkan jumlah aktual

#### Jika jumlah aktual = 1

- Pengguna hanya boleh memilih **satu** dari tiga kondisi.
- Setelah satu kondisi dipilih, tampilkan input jumlah di sebelah kondisi terpilih dengan nilai otomatis `1`.
- Kondisi yang tidak dipilih tidak aktif dan jumlahnya dianggap `0`.
- Jika pilihan dipindah, jumlah `1` berpindah ke kondisi yang baru.
- Jika kondisi belum dipilih, item tetap belum dinilai; jangan otomatis menyimpulkan kondisi.

#### Jika jumlah aktual > 1

- Pengguna boleh memilih satu atau beberapa kondisi karena unit dapat memiliki kondisi berbeda.
- Saat pengguna memilih suatu kondisi, munculkan kotak input integer kecil **di sebelah label kondisi tersebut** dengan transisi/animasi bergeser yang halus.
- Kotak jumlah hanya ada untuk kondisi yang dipilih. Kondisi yang tidak dipilih dianggap jumlah `0`.
- Contoh jumlah aktual `10`: Baik `7`, Rusak `2`, Belum dicek `1`.
- Total seluruh jumlah kondisi wajib sama dengan jumlah aktual sebelum data dapat disimpan.
- Tampilkan sisa/selisih secara langsung, misalnya `2 dari 10 unit belum dialokasikan` atau `Jumlah kondisi melebihi jumlah aktual`.

#### Jika jumlah aktual = 0

- Jangan tampilkan input jumlah kondisi.
- Jangan izinkan jumlah kondisi lebih dari 0.
- Keberadaan tetap mengikuti field Keberadaan. Jangan otomatis mengubah keberadaan menjadi Tidak Ada hanya karena jumlah aktual 0; tampilkan peringatan/validasi untuk diperiksa.

#### Jika jumlah aktual kosong

- Biarkan kondisi belum ditentukan atau tampilkan pilihan tanpa kotak jumlah sampai jumlah aktual diisi.
- Jangan menganggap kosong sama dengan nol.
- Jika pengguna memilih kondisi sebelum jumlah aktual diisi, simpan pilihan tersebut sebagai pilihan sementara di form; sesudah jumlah diisi, tampilkan input jumlah yang sesuai.

### 3. Hubungan dengan Keberadaan

- Jika Keberadaan = **Tidak Ada**, sembunyikan seluruh pilihan kondisi dan rincian jumlah kondisi; bersihkan nilai kondisi dan jumlah kondisi pada draft aktif agar tidak terbaca sebagai kondisi unit yang tidak ada.
- Jika Keberadaan = **Ada**, tampilkan bagian kondisi.
- Jika Keberadaan = **Belum dinilai**, kondisi belum dapat dianggap selesai.
- Saat pengguna mengubah Tidak Ada menjadi Ada, jangan membuat kondisi otomatis. Minta pengguna mengisi kondisi.

### 4. Jumlah rusak dan catatan lapangan

- Hilangkan field **Jumlah rusak** terpisah yang lama. Jumlah rusak berasal dari input kondisi **Rusak**.
- Jika jumlah Rusak lebih dari `0`, tandai **Catatan lapangan** dengan indikator merah dan label **Wajib**.
- Validasi catatan sesuai keputusan produk yang disetujui. Desain awal: blokir simpan jika jumlah Rusak > 0 tetapi catatan kosong.
- Jika nilai Rusak dihapus atau menjadi `0`, hilangkan penanda wajib kerusakan. Jangan menghapus catatan yang sudah ditulis tanpa konfirmasi.

### 5. Perubahan jumlah aktual

- Jika jumlah aktual berubah, hitung ulang total jumlah kondisi saat itu.
- Jika total kondisi lebih kecil, tampilkan jumlah yang belum dialokasikan.
- Jika total kondisi lebih besar, tampilkan kelebihan dan tandai input yang perlu dikoreksi.
- Jangan diam-diam menurunkan atau menghapus jumlah kondisi yang sudah dimasukkan.
- Jika Keberadaan berubah menjadi Tidak Ada, jelaskan bahwa rincian kondisi tidak berlaku; bersihkan rincian hanya setelah perubahan dilakukan eksplisit (atau minta konfirmasi bila sudah ada data kondisi).

### 6. Keadaan tampilan dan interaksi

- Input jumlah muncul di sebelah pilihan kondisinya, dengan lebar ringkas dan hanya menerima bilangan bulat nonnegatif.
- Animasi masuk/keluar singkat, halus, dan tidak menggeser layout secara mengejutkan. Hormati `prefers-reduced-motion`.
- Fokus keyboard harus berpindah secara wajar; semua pilihan dapat diakses tanpa mouse dan memiliki label aksesibel.
- Gunakan tanda visual yang konsisten: Baik = hijau, Rusak = merah, Belum dicek = warna netral/kuning. Jangan hanya mengandalkan warna; sertakan label teks.
- Setelah data lengkap, tampilkan ringkasan ringkas, misalnya `Baik 7 · Rusak 2 · Belum dicek 1`.
- Tampilkan pesan validasi di dekat input kondisi, bukan hanya toast global.
- Mode hanya lihat tetap menampilkan nilai yang tersimpan, tetapi semua kontrol dinonaktifkan.

### 7. Dampak pada progres dan status

- Kondisi item dinilai lengkap hanya jika jumlah aktual diketahui dan seluruh unit sudah dialokasikan ke kondisi (jumlah kondisi = jumlah aktual).
- Item berstatus **Perlu perhatian** jika jumlah Rusak > 0 atau jumlah Belum dicek > 0.
- Item hanya dapat dihitung **Siap** jika jumlah Rusak = 0, jumlah Belum dicek = 0, seluruh unit dialokasikan sebagai Baik, dan aturan target jumlah item terpenuhi.
- Pertahankan beda antara belum dinilai, Tidak Ada, dan jumlah aktual nol.
- Ringkasan, filter, ekspor, dan indikator progres nantinya harus memakai rincian jumlah kondisi ini, bukan field kondisi tunggal lama.

### 8. Item bervarian

- Jika beberapa tipe/varian dapat memiliki kondisi berbeda, gunakan rincian per **varian × kondisi** hanya bila kebutuhan pendataan mengharuskannya.
- Jika tipe hanya menjelaskan model yang dipilih dan kondisi tidak perlu dibedakan per tipe, gunakan satu rincian kondisi untuk total item.
- Jangan membuat matriks varian × kondisi secara otomatis karena dapat membuat form terlalu rumit. Beri tanda `PERLU KEPUTUSAN` untuk item yang tipe/variannya bisa bercampur.

### 9. Batasan implementasi sebelum desain disetujui

- Pada tahap desain, buat state UI dan contoh interaksi tanpa mengubah database.
- Jangan menghapus atau menulis ulang data lama saat migrasi desain.
- Sebelum penerapan produksi, petakan data lama: kondisi tunggal dan jumlah rusak perlu dikonversi atau dipertahankan sebagai data historis. Jangan menebak jumlah Baik/Belum dicek yang belum pernah dicatat.
- Setelah desain disetujui, baru rancang perubahan skema/API, migrasi aman, validasi server, ringkasan, dan ekspor.

### 10. Kriteria penerimaan

- Untuk jumlah aktual `1`, tepat satu kondisi dapat dipilih dan jumlahnya `1`.
- Untuk jumlah aktual lebih dari `1`, pengguna dapat memilih kondisi campuran dan jumlah kondisi harus berjumlah tepat sama dengan jumlah aktual.
- Kotak jumlah hanya tampil untuk kondisi yang dipilih dan muncul di sisi label kondisi.
- Perubahan jumlah aktual tidak menghapus rincian kondisi secara diam-diam.
- Rusak > 0 memunculkan catatan wajib dan validasi simpan.
- Tidak Ada menyembunyikan kondisi; kosong tetap berarti belum dinilai.
- Status hanya-baca tetap berfungsi dan data lama tidak hilang.
- Animasi tetap nyaman pada perangkat lambat dan mengikuti pengaturan reduce motion.

## Daftar keputusan pemilik produk

Isi atau ubah sebelum implementasi:

- **Catatan Rusak wajib blokir Simpan:** Ya / Tidak.
- **Jumlah aktual nol tetapi keberadaan Ada:** diperbolehkan / harus diberi peringatan / tidak diperbolehkan.
- **Jika jumlah aktual berubah dan rincian tidak cocok:** simpan sementara dengan peringatan / blokir sampai benar.
- **Varian yang perlu rincian kondisi terpisah:** tulis nomor Form B dan nama item.
- **Kelompok status ketika sebagian item belum lengkap:** tulis perilaku final.
