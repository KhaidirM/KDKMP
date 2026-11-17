# Daftar Grup, Item, Rencana, dan Penilaian Sarpras — Revisi

## Acuan logika penilaian

### 1. Susunan formulir dan kelompok

- Formulir terdiri dari grup yang masing-masing memuat satu atau beberapa item.
- Status kelompok: **Belum dinilai**, **Ada**, atau **Tidak Ada**. Memilih Ada/Tidak Ada mengisi keberadaan semua item di dalam grup. Keberadaan setiap item tetap dapat diedit. Jika isian item campuran, status kelompok menjadi **Sebagian**.
- Susunan penilaian item: **Rencana**, **Keberadaan**, **Tipe/Jenis**, **Gambar**, **Kondisi**, **Jumlah**, **Catatan**. Kolom khusus hanya digunakan pada item yang memerlukannya.
- Rencana hanya ditampilkan dan tidak dapat diedit. Bila nilainya tidak tercantum, Rencana tetap ditampilkan dengan nilai **—**.

### 2. Keberadaan, tipe, dan gambar

- Keberadaan awal **Tidak Ada**. Status kelompok mengisi keberadaan item, tetapi pengguna tetap dapat mengubahnya satu per satu.
- Jika item **Ada**, tampilkan Tipe/Jenis (bila memiliki varian), Gambar, Kondisi, dan Jumlah. Jika **Tidak Ada**, sembunyikan Tipe/Jenis, Kondisi, dan Jumlah.
- Tipe/Jenis menampilkan pilihan varian item. Gambar berubah mengikuti varian yang dipilih. Jika gambar tidak tersedia atau gagal dimuat, tampilkan pesan yang sesuai.
- Gambar itu termasuk aset, cara penampilannya mengikuti design ui.

### 3. Kondisi dan jumlah

- Kondisi: **Baik**, **Rusak**, **Belum dicek**. Untuk penilaian fungsi, gunakan label **Berfungsi** sebagai pengganti Baik.
- Rencana 1 unit: kondisi pilihan tunggal. Setelah dipilih, tampilkan jumlah di samping kondisi dan isi otomatis **1**; pilihan kondisi lain tidak aktif.
- Rencana lebih dari 1 unit: kondisi dapat dipilih lebih dari satu. Setiap kondisi yang dipilih menampilkan kotak jumlah di sampingnya.
- Jumlah aktual adalah total jumlah Baik/Berfungsi, Rusak, dan Belum dicek. Jumlah harus bilangan bulat nonnegatif; kolom ringkas cukup untuk dua digit.
- Bila kondisi Rusak dipilih, jumlah rusak wajib diisi. Jika ada jumlah rusak, Catatan wajib diisi.

### 4. Catatan, pengingat, dan penyimpanan

- Setiap item memiliki Catatan maksimal **800 karakter**. Kolom kosong menampilkan placeholder *catatan* yang hilang saat kolom dipilih.
- Isian wajib yang belum lengkap menampilkan pengingat, tetapi pengingat tidak menghalangi penyimpanan.
- Sediakan tombol Simpan melayang yang tidak menutupi logo Netlify serta tombol Simpan di bagian paling bawah formulir.
- Saat offline, perubahan dapat disimpan sebagai draft lokal. Draft dapat dikirim ke server saat koneksi tersedia.

### 5. Kolom khusus

- **Aliran air** hanya untuk alat yang dapat diperiksa aliran airnya, seperti keran dan wastafel: Teraliri / Tidak teraliri / Belum dicek. Tidak digunakan pada Sumber air maupun WC.
- **Aliran listrik** pada lampu: Ya / Tidak / Belum dicek. **Saklar** hanya untuk lampu: Ada / Tidak ada.
- **Daya terpasang** hanya untuk MCB: 1.300; 2.200; 3.500; 4.400; 5.500; 6.600; 7.700; 10.600; 11.000; 13.200; 16.500; 23.000; 33.000; 41.500; 53.000; 66.000; 82.500 VA; atau Lainnya dengan input nominal dan satuan VA.
- **Letak posisi** instalasi: Di dalam gudang utama / Di luar gudang utama / Lainnya. Gunakan pada instalasi listrik dan panel listrik.
- Sumber air dinilai dengan jenis Sumur bor/Sumur warga/Sumur desa/PAM desa/PAMSIMAS/Aliran sungai/Lainnya dan keterhubungan ke instalasi Ya/Tidak.
- WC dinilai dengan tipe Jongkok/Duduk, bidet Ada/Tidak ada, dan keterhubungan septic tank Ya/Tidak.
- Pompa air memiliki penilaian fungsi. Internet dan software kasir memiliki status fungsi. Struk dan Thermal Label merupakan persediaan/ketersediaan, bukan aset yang dinilai kondisi per unit.

## Daftar grup dan item

## Grup 1 — Kendaraan

### 1. Truk 6 ban bak kayu/besi

- **Nama item:** Truk 6 ban bak kayu/besi
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 2. Kendaraan pick-up 4WD (4x4)

- **Nama item:** Kendaraan pick-up 4WD (4x4)
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 3. Motor bak roda 3

- **Nama item:** Motor bak roda 3
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 2 — 1 Set Mesin Kasir

### 4. POS (Point of Sales)

- **Nama item:** POS (Point of Sales)
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 5. Cash Drawer

- **Nama item:** Cash Drawer
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 6. Gun Scanner

- **Nama item:** Gun Scanner
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 7. Finger Print

- **Nama item:** Finger Print
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 8. Printer Receipt

- **Nama item:** Printer Receipt
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 9. Printer Barcode

- **Nama item:** Printer Barcode
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 10. EDC

- **Nama item:** EDC
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 11. WiFi Router/Modem

- **Nama item:** WiFi Router/Modem
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 12. UPS

- **Nama item:** UPS
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 3 — 1 Set CCTV

### 13. IP Camera Indoor

- **Nama item:** IP Camera Indoor
- **Rencana:** 4 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 14. IP Camera Outdoor

- **Nama item:** IP Camera Outdoor
- **Rencana:** 4 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 15. NVR 8 Channel

- **Nama item:** NVR 8 Channel
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 16. POE Switch 10 Port

- **Nama item:** POE Switch 10 Port
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 17. HDD Minimal 2 TB

- **Nama item:** HDD Minimal 2 TB
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 18. Kabel LAN Cat 6

- **Nama item:** Kabel LAN Cat 6
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 19. LED Display 19 Inch

- **Nama item:** LED Display 19 Inch
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 20. Wallmount Rack Server 4U

- **Nama item:** Wallmount Rack Server 4U
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 21. Connector RJ45 Belden Cat 5

- **Nama item:** Connector RJ45 Belden Cat 5
- **Rencana:** 20 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 22. Stop Kontak 6 Slot

- **Nama item:** Stop Kontak 6 Slot
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 23. Pipa PVC 20 mm

- **Nama item:** Pipa PVC 20 mm
- **Rencana:** 35 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 24. Sok Pipa

- **Nama item:** Sok Pipa
- **Rencana:** 35 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 25. Kabel Duct 40 x 25 mm (1 batang = 3 m)

- **Nama item:** Kabel Duct 40 x 25 mm (1 batang = 3 m)
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 26. Kabel Ties 20 cm

- **Nama item:** Kabel Ties 20 cm
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 27. Isolasi Listrik

- **Nama item:** Isolasi Listrik
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 28. Kabel HDMI 1,5 m

- **Nama item:** Kabel HDMI 1,5 m
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 29. Double Tape 3M

- **Nama item:** Double Tape 3M
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 4 — Konektivitas \& Software

### 30. Internet

- **Nama item:** Internet
- **Rencana:** 1 layanan
- **Penilaian:** Keberadaan; Jenis koneksi; Status berfungsi; Catatan

### 31. Perangkat Lunak Kasir (Software KDKMP)

- **Nama item:** Perangkat Lunak Kasir (Software KDKMP)
- **Rencana:** 1 paket
- **Penilaian:** Keberadaan; Status berfungsi; Catatan

## Grup 5 — Air Conditioner

### 32. AC 2 PK

- **Nama item:** AC 2 PK
- **Rencana:** 3 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 33. AC 1 PK

- **Nama item:** AC 1 PK
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 6 — Furniture Gerai

### 34. Meja Koperasi Simpan Pinjam

- **Nama item:** Meja Koperasi Simpan Pinjam
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 35. Laci Dorong

- **Nama item:** Laci Dorong
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 36. Rak Etalase

- **Nama item:** Rak Etalase
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 37. Meja Kasir

- **Nama item:** Meja Kasir
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 7 — Apotek

### 38. Lemari Display Apotek

- **Nama item:** Lemari Display Apotek
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 8 — Perlengkapan Klinik

### 39. Meja Administrasi Klinik

- **Nama item:** Meja Administrasi Klinik
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 40. Laci Dorong

- **Nama item:** Laci Dorong
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 41. Kursi (10 Unit)

- **Nama item:** Kursi (10 Unit)
- **Rencana:** 10 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 42. Meja Dokter

- **Nama item:** Meja Dokter
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 43. Tempat Tidur Periksa Pasien

- **Nama item:** Tempat Tidur Periksa Pasien
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 9 — Perlengkapan Rak Gerai

### 44. Rak Display Single/Wall/Pinggir 90x40x180 cm

- **Nama item:** Rak Display Single/Wall/Pinggir 90x40x180 cm
- **Rencana:** 11 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 45. Rak Display Double/Island/Tengah 90x80x150 cm

- **Nama item:** Rak Display Double/Island/Tengah 90x80x150 cm
- **Rencana:** 24 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 46. Rak Display End 80x40x150 cm

- **Nama item:** Rak Display End 80x40x150 cm
- **Rencana:** 6 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 10 — APAR

### 47. APAR 3 kg

- **Nama item:** APAR 3 kg
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 48. APAR 9 kg

- **Nama item:** APAR 9 kg
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 11 — Keranjang Belanja

### 49. Keranjang Tarik

- **Nama item:** Keranjang Tarik
- **Rencana:** 20 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 50. Keranjang Jinjing

- **Nama item:** Keranjang Jinjing
- **Rencana:** 20 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 12 — Seragam KDKMP

### 51. Kemeja

- **Nama item:** Kemeja
- **Rencana:** 18 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 52. Kaos Polo

- **Nama item:** Kaos Polo
- **Rencana:** 36 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 13 — Perlengkapan Lain

### 53. Pallet

- **Nama item:** Pallet
- **Rencana:** 25 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 54. Printer

- **Nama item:** Printer
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 55. Brankas

- **Nama item:** Brankas
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 56. Genset

- **Nama item:** Genset
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 14 — ATK

### 57. Stempel

- **Nama item:** Stempel
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 58. Struk

- **Nama item:** Struk
- **Rencana:** 20 unit
- **Penilaian:** Keberadaan; Jumlah aktual; Ketersediaan; Catatan

### 59. Thermal Label

- **Nama item:** Thermal Label
- **Rencana:** 5 unit
- **Penilaian:** Keberadaan; Jumlah aktual; Ketersediaan; Catatan

## Grup 15 — Alat Kebersihan

### 60. Tempat Sampah Besar

- **Nama item:** Tempat Sampah Besar
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 61. Alat Pel dan Ember

- **Nama item:** Alat Pel dan Ember
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 62. Sapu Lantai dan Pengki

- **Nama item:** Sapu Lantai dan Pengki
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 16 — Komputer

### 63. PC All in One Intel, RAM 8 GB, SSD 512 GB

- **Nama item:** PC All in One Intel, RAM 8 GB, SSD 512 GB
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 17 — Beverages \& Frozen Foods

### 64. Chiller 1 Pintu (2 Unit)

- **Nama item:** Chiller 1 Pintu (2 Unit)
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 65. Chest Freezer Kapasitas sekitar 680 Liter

- **Nama item:** Chest Freezer Kapasitas sekitar 680 Liter
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 18 — Ventilasi

### 66. Kipas Plafon

- **Nama item:** Kipas Plafon
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 67. Exhaust Fan

- **Nama item:** Exhaust Fan
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 19 — Perlengkapan Lain

### 68. Loker Lemari

- **Nama item:** Loker Lemari
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 20 — Keamanan \& Kehadiran

### 69. Alarm Toko

- **Nama item:** Alarm Toko
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

### 70. Mesin Absensi

- **Nama item:** Mesin Absensi
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe/Jenis; Gambar; Kondisi; Jumlah; Catatan

## Grup 21 — Instalasi Air

### 71. Sumber air

- **Nama item:** Sumber air
- **Rencana:** —
- **Penilaian:** Keberadaan; Jenis sumber air; Terhubung ke instalasi; Catatan

### 72. Pompa air

- **Nama item:** Pompa air
- **Rencana:** —
- **Penilaian:** Keberadaan; Fungsi; Kondisi; Jumlah; Catatan

### 73. Keran air

- **Nama item:** Keran air
- **Rencana:** 3 unit
- **Penilaian:** Keberadaan; Aliran air; Kondisi; Jumlah; Catatan

### 74. Wastafel klinik

- **Nama item:** Wastafel klinik
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Aliran air; Kondisi; Jumlah; Catatan

### 75. Wastafel gudang

- **Nama item:** Wastafel gudang
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Aliran air; Kondisi; Jumlah; Catatan

### 76. WC klinik

- **Nama item:** WC klinik
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Tipe WC; Bidet; Terhubung septic tank; Kondisi; Jumlah; Catatan

### 77. WC gudang

- **Nama item:** WC gudang
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Tipe WC; Bidet; Terhubung septic tank; Kondisi; Jumlah; Catatan

### 78. Septic tank

- **Nama item:** Septic tank
- **Rencana:** —
- **Penilaian:** Keberadaan; Kondisi; Jumlah; Catatan

## Grup 22 — Instalasi Listrik

### 79. Instalasi listrik

- **Nama item:** Instalasi listrik
- **Rencana:** —
- **Penilaian:** Keberadaan; Kelayakan; Letak posisi; Catatan

### 80. Sertifikat Laik Operasi (SLO)

- **Nama item:** Sertifikat Laik Operasi (SLO)
- **Rencana:** —
- **Penilaian:** Keberadaan; Catatan

### 81. Sumber listrik

- **Nama item:** Sumber listrik
- **Rencana:** —
- **Penilaian:** Keberadaan; Catatan

### 82. MCB

- **Nama item:** MCB
- **Rencana:** —
- **Penilaian:** Keberadaan; Daya terpasang; Kondisi; Catatan

### 83. Panel listrik

- **Nama item:** Panel listrik
- **Rencana:** —
- **Penilaian:** Keberadaan; Letak posisi; Kondisi; Catatan

### 84. Lampu area bongkar muat

- **Nama item:** Lampu area bongkar muat
- **Rencana:** 1 unit
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 85. Lampu gantung gudang utama

- **Nama item:** Lampu gantung gudang utama
- **Rencana:** 10–12 unit
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 86. Lampu gudang pupuk

- **Nama item:** Lampu gudang pupuk
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 87. Lampu gudang tabung gas (LPG)

- **Nama item:** Lampu gudang tabung gas (LPG)
- **Rencana:** 4 unit
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 88. Lampu toilet gudang utama

- **Nama item:** Lampu toilet gudang utama
- **Rencana:** 2 unit (masing-masing 1)
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 89. Lampu swalayan

- **Nama item:** Lampu swalayan
- **Rencana:** 12–16 unit
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 90. Lampu klinik

- **Nama item:** Lampu klinik
- **Rencana:** 2 unit
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 91. Lampu teras depan swalayan (teras gerai)

- **Nama item:** Lampu teras depan swalayan (teras gerai)
- **Rencana:** 6 unit
- **Penilaian:** Keberadaan; Aliran listrik; Saklar; Kondisi; Jumlah; Catatan

### 92. Colokan gudang utama

- **Nama item:** Colokan gudang utama
- **Rencana:** —
- **Penilaian:** Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan

### 93. Colokan gudang LPG

- **Nama item:** Colokan gudang LPG
- **Rencana:** —
- **Penilaian:** Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan

### 94. Colokan gudang pupuk

- **Nama item:** Colokan gudang pupuk
- **Rencana:** —
- **Penilaian:** Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan

### 95. Colokan swalayan

- **Nama item:** Colokan swalayan
- **Rencana:** —
- **Penilaian:** Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan

### 96. Colokan klinik

- **Nama item:** Colokan klinik
- **Rencana:** —
- **Penilaian:** Keberadaan; Aliran listrik; Kondisi; Jumlah; Catatan
