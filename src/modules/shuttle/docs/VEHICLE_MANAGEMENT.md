# Manajemen Kendaraan Shuttle - Dokumentasi Teknis

## 1. Ikhtisar Fitur
Fitur manajemen kendaraan memungkinkan administrator untuk mengontrol ketersediaan armada secara dinamis. Kendaraan yang dinonaktifkan akan segera disembunyikan dari pilihan pengguna pada alur pemesanan shuttle, tanpa menghapus data historis booking yang terkait dengan kendaraan tersebut.

## 2. Implementasi Teknis

### Status Aktif/Non-aktif
Status kendaraan dikelola melalui properti `active` (boolean) pada objek `VehicleType`. Properti ini dipersistensikan ke tabel `vehicle_types` di Supabase.

### Sinkronisasi Admin & User
- **Admin Panel**: Administrator mengelola status melalui `AdminVehicles.tsx`. Perubahan status dilindungi oleh `AlertDialog` untuk mencegah penonaktifan yang tidak disengaja.
- **User App**: Komponen `ShuttleVehicle.tsx` melakukan filter otomatis menggunakan `getVehicleTypesAll().filter((v) => v.active !== false)`.
- **Real-time**: Menggunakan mekanisme `cloudStore` dan `realtime sync` Supabase, perubahan status akan langsung terlihat di aplikasi user tanpa perlu refresh halaman.

### Audit Trail
Setiap perubahan status dicatat dalam log audit melalui fungsi `saveVehicleTypes` di `repository.ts`. Log mencatat:
- ID Kendaraan
- Status lama -> Status baru
- Timestamp kejadian

## 3. Penanganan Edge Case
- **Booking Berjalan**: Menonaktifkan kendaraan tidak akan membatalkan tiket yang sudah dibayar. Tiket tersebut tetap valid, namun pengguna baru tidak dapat memilih kendaraan tersebut untuk jadwal mendatang.
- **Validasi Input**: Administrator diberikan konfirmasi visual (Switch) dan dialog peringatan sebelum status diubah.

## 4. User Manual (Admin)
1. Buka menu **Master Data** > **Kendaraan** di panel Admin.
2. Temukan kendaraan yang ingin dikelola.
3. Geser **Switch Aktif/Nonaktif**.
4. Baca peringatan pada dialog konfirmasi, lalu klik **Lanjutkan**.
5. Klik tombol **Simpan** di pojok kanan atas untuk menerapkan perubahan ke cloud.

## 5. Verifikasi (Testing)
Integrasi diuji menggunakan Vitest di `src/modules/shuttle/data/__tests__/vehicleSync.test.ts`. Tes memastikan filter sisi user bekerja dengan benar dan audit trail mencatat perubahan status secara akurat.
