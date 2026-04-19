

# Plan: Storage bucket untuk denah, Cloud-status badge, & Realtime jam berangkat

## 1. Upload denah kursi ke Storage Bucket

**Masalah**: Saat ini admin upload gambar denah → di-encode jadi `dataURL` base64 → disimpan di kolom `seat_layouts.layout` (JSONB). Untuk gambar 200KB jadi ~270KB base64 di tiap row × 9 kombinasi = bisa MB-an dan lambat saat hydrate.

**Solusi**:
- Buat storage bucket `seat-layout-images` (public read) via migration.
- RLS bucket: SELECT public, INSERT/UPDATE/DELETE admin only.
- Refactor `handleImageUpload` di `SeatEditorPanel.tsx`:
  1. Upload file → `supabase.storage.from('seat-layout-images').upload(path)`
  2. Path format: `{vehicleId}-{tier}-{timestamp}.{ext}` supaya cache-bustable.
  3. Get public URL → simpan URL string di `config.image` (bukan dataURL).
- Tambah helper `uploadSeatLayoutImage()` di `cloudStore.ts`.
- Saat `clearLayoutFromStorage` dipanggil, hapus file lama dari storage juga (best effort).

## 2. Badge "Tersimpan di cloud" + waktu update terakhir

**Perubahan**:
- Tambah kolom `updated_at` dipakai (sudah ada di tabel `seat_layouts`). Hydrate masukkan `updated_at` ke cache: extend `cache.seatLayouts` value menyimpan `{ payload, updatedAt }`.
- Di `SeatEditorPanel.tsx`, header card layout-key:
  - Replace badge "Tersimpan" jadi: `<Badge variant="default">☁ Tersimpan di cloud</Badge>` + teks `Diperbarui: 2 menit lalu` (relative time pakai `Intl.RelativeTimeFormat`).
  - Saat tombol "Simpan" diklik dan sukses, update timestamp lokal langsung supaya badge instan refresh.

## 3. Realtime Jam Berangkat (sudah ada tabel, tinggal sync)

**Status**: Tabel `depart_times` sudah ada + `persistDepartTimes` sudah jalan + hydrate sudah baca dari DB. Saat refresh datanya aman ✅.

**Masalah residual**: Kalau admin di device A tambah jam, device B/customer baru lihat setelah reload manual karena tidak ada realtime listener untuk `depart_times` (saat ini cuma `shuttle_bookings`, `seat_blocks`, `seat_layouts` yang realtime).

**Solusi**:
- Migration: aktifkan replica + add publication untuk `depart_times`, `rayons`, `pickup_points`, `services`, `vehicle_types`, `shuttle_settings` supaya semua master data live-sync.
- Di `setupRealtime()` `cloudStore.ts`, tambah channel generic yang refetch table terkait saat ada perubahan (sederhana: per table, refetch + map ke cache + notify).

## File yang Disentuh

- **Migration baru**: bucket `seat-layout-images` + storage RLS + enable realtime untuk 6 tabel master.
- **`src/modules/shuttle/data/cloudStore.ts`**: `uploadSeatLayoutImage()` helper, simpan `updated_at` per layout, expand realtime ke master tables.
- **`src/modules/shuttle/data/seatLayouts.ts`**: `loadLayoutFromStorage` return juga `updatedAt`.
- **`src/modules/shuttle/components/SeatEditorPanel.tsx`**: ganti `handleImageUpload` ke storage upload, tambah badge cloud + relative timestamp.

## Yang Tidak Termasuk

- Tidak migrasi otomatis dataURL lama yang sudah tersimpan ke storage — saat admin re-upload, dataURL akan tergantikan URL baru.
- Tidak ada UI quota/storage usage.

## Hasil

- Denah kursi upload → masuk storage bucket, row `seat_layouts` cuma simpan URL pendek → ringan, fast hydrate.
- Editor menampilkan badge "☁ Tersimpan di cloud · Diperbarui 5 menit lalu".
- Edit jam berangkat di Admin Rayons device A → device B (admin/customer) langsung dapat update tanpa refresh.

