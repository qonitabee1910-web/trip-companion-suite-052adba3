# Dokumentasi Teknis: Sistem Perhitungan Tarif Shuttle PYU-GO

## Ringkasan
Sistem perhitungan tarif shuttle telah diperbarui untuk mendukung metode perhitungan yang fleksibel, validasi data yang ketat, dan audit logging bagi admin. Perubahan ini memungkinkan admin untuk memilih metode perhitungan yang paling sesuai dengan strategi bisnis perusahaan melalui panel kontrol admin.

## Komponen Utama

### 1. Metode Perhitungan (`FareSettings`)
Sistem mendukung tiga metode utama:
- **Berbasis Jarak (`distance_based`)**: Rumus utama adalah `(Jarak dalam KM × Harga per KM Service) + Biaya Dasar Kendaraan + Surcharge Rayon`. Ini adalah metode yang direkomendasikan untuk akurasi biaya operasional.
- **Berbasis Tier (`tier_based`)**: Menggunakan harga flat berdasarkan tier layanan (Reguler, Semi-Executive, Executive) dan kendaraan, tanpa mempertimbangkan jarak tempuh.
- **Harga Tetap (`fixed`)**: Menggunakan satu harga global untuk semua jenis pesanan (contoh: Rp 100.000).

### 2. Validasi & Pembatasan
Untuk menjaga integritas data dan mencegah kerugian:
- **Tarif Minimum**: Sistem menjamin harga total tidak akan pernah di bawah batas minimum (default: Rp 50.000).
- **Jarak Maksimum**: Validasi input jarak untuk mencegah perhitungan rute yang tidak wajar atau di luar area layanan (default: 500 KM).
- **Rounding**: Hasil perhitungan dibulatkan ke ribuan terdekat (e.g., Rp 51.200 menjadi Rp 51.000) untuk kemudahan transaksi.

### 3. Audit Logging
Setiap perubahan pada pengaturan tarif oleh admin dicatat dalam tabel `shuttle_activity_logs`. Data yang dicatat meliputi:
- User ID (Admin yang melakukan perubahan).
- Aksi (`update_fare_settings`).
- Detail perubahan (Nilai sebelum vs sesudah dalam format JSON).
- Metadata (IP Address, User Agent, Timestamp).

## Implementasi Kode

- **Logic Perhitungan**: [refinedFareCalculator.ts](file:///d%3A/PYU-GO/trip-companion-suite-052adba3/src/modules/shuttle/lib/refinedFareCalculator.ts)
- **Data Store**: [cloudStore.ts](file:///d%3A/PYU-GO/trip-companion-suite-052adba3/src/modules/shuttle/data/cloudStore.ts)
- **Admin UI**: [AdminFareSettings.tsx](file:///d%3A/PYU-GO/trip-companion-suite-052adba3/src/modules/admin/pages/AdminFareSettings.tsx)
- **Unit Tests**: [refinedFareCalculator.test.ts](file:///d%3A/PYU-GO/trip-companion-suite-052adba3/src/modules/shuttle/lib/refinedFareCalculator.test.ts)

## Cara Penggunaan Admin
1. Navigasi ke menu **Setup Layanan > Tarif & Formula**.
2. Pilih **Metode Perhitungan** yang diinginkan.
3. Atur **Tarif Minimum** dan **Jarak Maksimum**.
4. Klik **Simpan Perubahan**.
5. Perubahan akan langsung diterapkan pada semua perhitungan harga baru di sisi pelanggan.
6. Pantau **Histori Aktivitas** di bagian bawah halaman untuk melihat log perubahan.

## Verifikasi
Sistem telah diverifikasi melalui unit testing otomatis yang mencakup skenario:
- Perhitungan jarak standar.
- Penerapan tarif minimum.
- Perpindahan metode perhitungan (Jarak vs Tier vs Fixed).
- Pembatasan jarak maksimum (Capping).
