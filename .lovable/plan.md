

# Plan: Editor Koordinat Lat/Lng untuk Titik Jemput di Admin Rayons

## Konsep
Tambahkan UI di `/admin/shuttle/rayons` agar admin bisa:
1. Lihat & edit `lat`/`lng` tiap pickup point.
2. Tangkap koordinat dengan **klik di peta Leaflet** (paling intuitif), atau drag marker.
3. Preview rute & marker langsung saat edit.

## Perubahan UI di `AdminRayons.tsx`

Di dialog edit rayon, **section "Titik Jemput & Jarak"** ditambahkan:

**A. Kolom baru di tabel pickup points:**
- Kolom **Koordinat**: tampil `lat, lng` (4 desimal) atau "—" jika kosong.
- Tombol kecil 📍 per baris → set baris itu sebagai "target capture" (highlighted).
- Input manual lat & lng (dua input number kecil) untuk yang prefer ketik.

**B. Card peta di bawah tabel** (`PickupCoordinateMap.tsx` baru):
- Leaflet map full-width, height 360px.
- Render semua titik yang sudah punya koordinat sebagai marker bernomor + polyline.
- **Klik di peta** → set `lat`/`lng` ke baris yang sedang "active" (target capture). Auto-advance ke baris berikutnya yang masih kosong.
- Marker bisa di-**drag** untuk fine-tune (`draggable: true`, `dragend` event update state).
- Mode capture indicator: banner di atas peta "Klik di peta untuk set koordinat **J3 - Cambridge**" + tombol Cancel.
- Tombol "Center to Medan" (default view 3.58, 98.67, zoom 12) jika belum ada titik.
- Tombol "Fit semua titik" jika sudah ada koordinat.

**C. Tombol "Geocode otomatis"** (opsional, simpel):
- Untuk MVP: skip geocoding eksternal (perlu API key). Cukup klik-peta + drag.

## Komponen Baru

`src/modules/admin/components/PickupCoordinateMap.tsx`
- Props: `points`, `activeCode`, `onCapture(code, lat, lng)`, `onDragMarker(code, lat, lng)`.
- Pakai `react-leaflet` (sudah terinstall).
- `useMapEvents` untuk handle click → panggil `onCapture(activeCode, e.latlng.lat, e.latlng.lng)`.
- Marker `draggable` + `eventHandlers.dragend` → `onDragMarker`.
- Polyline antar titik berkoordinat (urutan sesuai array).
- DivIcon nomor seperti `RayonRouteMap.tsx` (reuse style).

## Schema
Tidak perlu ubah—`lat?` & `lng?` sudah opsional di `PickupPoint` (dari iterasi sebelumnya).

## State Management di Dialog
- Existing `editingRayon.pickupPoints` state diperluas dengan field `lat`/`lng`.
- State baru `activeCaptureCode: string | null` untuk track baris target.
- Handler `handleCapture(code, lat, lng)` update array & auto-advance `activeCaptureCode` ke titik kosong berikutnya (atau null jika selesai).
- Save dialog → persist via repository (sudah ada).

## File Changes

**NEW:** `src/modules/admin/components/PickupCoordinateMap.tsx`

**EDIT:**
- `src/modules/admin/pages/AdminRayons.tsx` — kolom koordinat di tabel pickup, integrate `PickupCoordinateMap`, state capture mode, handler click/drag.

## UX Flow
1. Admin buka dialog edit Rayon A.
2. Scroll ke section pickup points → lihat tabel + peta di bawah.
3. Klik 📍 di baris J1 → banner "Klik di peta untuk set koordinat J1 - Hermes Palace".
4. Klik di peta → marker muncul, lat/lng terisi di tabel, auto-advance ke J2.
5. Drag marker untuk koreksi → update otomatis.
6. Save → koordinat tersimpan, dipakai di `ShuttleRayon` map user.

## Hasil
Admin punya editor visual untuk koordinat tanpa perlu cari lat/lng manual di Google Maps. Workflow cepat: klik 14 titik di peta = selesai satu rayon. Hasilnya langsung dipakai di peta user shuttle.

