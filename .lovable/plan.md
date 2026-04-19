

# Plan: Peta Leaflet Rute Rayon + Auto-Recalc Jam per Titik berdasarkan Jam Berangkat

## Konsep Inti

1. **Tambahkan koordinat (lat, lng)** ke tiap `PickupPoint` di seed 4 rayon (Medan area). Saya akan isi koordinat berbasis nama hotel/landmark Medan yang sudah dikenal (Hermes Palace ~3.5752,98.6722; KNO ~3.6422,98.8853; dst.). Koordinat opsional di interface—titik tanpa koordinat akan di-skip dari peta tapi tetap tampil di list.

2. **Render Leaflet map** di `ShuttleRayon` dengan:
   - Multi-marker (numbered: J1, J2, ..., DEST=pesawat)
   - Polyline biru menghubungkan semua titik berurutan
   - Marker yang dipilih user → highlight (warna primary, lebih besar)
   - `fitBounds` otomatis sesuai semua titik
   - Tap marker = pilih pickup tersebut (sinkron dengan grid)

3. **Auto-recalc jam tiap titik berdasarkan Jam Berangkat user**:
   - Seed punya jam baseline (J1=06:00). Hitung **offset menit** tiap titik dari J1 (J2=+5min, J3=+10min, dst.).
   - Saat user pilih jam berangkat (misal 09:00), semua titik di-shift: J1=09:00, J2=09:05, ..., DEST=09:00+totalOffset.
   - Helper baru `getShiftedSchedule(rayon, departTime)` → return `{ code, time }[]`.
   - Tampil di chip pickup, di marker popup, dan di info "Tiba ±HH:MM" di header.

## Schema Update

```ts
interface PickupPoint {
  code: string;
  name: string;
  time: string;          // baseline (J1 reference)
  distanceToNext: number;
  lat?: number;          // NEW
  lng?: number;          // NEW
}
```

Migration helper sudah ada—tinggal pass-through `lat`/`lng` jika ada.

## Komponen Baru: `RayonRouteMap.tsx`

Lokasi: `src/modules/shuttle/components/RayonRouteMap.tsx`

- Pakai `react-leaflet` (sudah terinstall, lihat `MiniMap.tsx`).
- Props: `rayon`, `selectedCode`, `onSelect`, `shiftedTimes` (Map<code, time>).
- DivIcon kustom: lingkaran kecil dengan nomor (J1...) atau ikon pesawat untuk DEST. Warna beda untuk selected vs default vs destinasi.
- Polyline `[lat,lng][]` sepanjang urutan titik (skip yg tidak punya koordinat).
- `useMap` + `fitBounds` saat mount.
- Height ~280px mobile, 360px desktop. `scrollWheelZoom={false}` untuk UX scroll halaman.

## Helper Baru di `rayons.ts`

```ts
export function getScheduleOffsets(rayon): { code, offsetMin }[]
export function getShiftedSchedule(rayon, departTime): Map<code, "HH:MM">
```

Parse `time` baseline → hitung selisih menit dari titik pertama → tambahkan ke `departTime` user.

## Integrasi di `ShuttleRayon.tsx`

- Hitung `shifted = getShiftedSchedule(rayon, time)` (re-compute saat `time` berubah).
- Tampilkan `<RayonRouteMap />` sebagai card baru **di antara header info dan card form** (line 92-94).
- Chip pickup tampilkan `shifted.get(p.code)` bukan `p.time`.
- Header info tambah "Tiba ±{shifted.get('DEST')}".

## Seed Koordinat (4 Rayon)

Saya akan isi koordinat plausible Medan untuk semua titik (pakai pengetahuan landmark umum: hotel-hotel besar, simpang, RS, KNO airport). Keakuratan ±200m cukup untuk visualisasi rute. Admin tetap bisa edit nanti jika perlu (akan ditambahkan field koordinat di AdminRayons di iterasi terpisah jika diminta).

## File Changes

**NEW:** `src/modules/shuttle/components/RayonRouteMap.tsx`

**EDIT:**
- `src/modules/shuttle/data/rayons.ts` — `lat`/`lng` di PickupPoint, koordinat di seed 4 rayon, helper `getShiftedSchedule` & `getScheduleOffsets`, update `migrateRayon` pass-through koordinat.
- `src/modules/shuttle/pages/ShuttleRayon.tsx` — render map, pakai jam shifted di chip & header.

## Hasil

User di `/shuttle/rayon/A` lihat peta interaktif rute Rayon A dengan polyline melewati 14 titik + KNO. Saat user ubah Jam Berangkat dari 06:00 ke 09:00, semua jam di chip + popup marker auto-update (J1=09:00, ..., KNO=11:14). Tap marker di peta = otomatis pilih pickup itu. Info "Tiba ±11:14" muncul di header.

