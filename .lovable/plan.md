# Plan: Seed Data Rayon + Auto Fare Calculation by Distance

## Analisis Data Gambar

Tiap rayon punya urutan titik jemput dengan: **nama**, **jam pickup**, dan **jarak (meter) ke titik berikutnya**. Titik terakhir adalah destinasi (KNO/Kualanamu). Total jarak = jumlah semua segmen → jadi basis fare per-km.

**Seed (dari foto):**

- **Rayon A** — Medan Pusat — 14 titik + KNO. Total 58.250 m (~58 km). J1 Hermes Palace 06.00 → … → KNO 08.14.
- **Rayon B** — Medan Barat — 18 titik + KNO. Total 65.520 m. J1 Cambridge 06.00 → … → KNO 08.25.
- **Rayon C** — Medan Timur — 12 titik + Tol KNO. Total 31.400 m. J1 Adi Mulia 06.00 → … → Tol KNO 07.30.
- **Rayon D** — Medan Polonia — 17 titik + Kualanamu. Total 30.000 m. J1 Hotel TD Pardede 06.00 → … → Kualanamu 08.32.

## Perubahan Skema

Ubah `pickupPoints: string[]` jadi `pickupPoints: PickupPoint[]`:

```ts
interface PickupPoint {
  code: string;       // J1, J2…
  name: string;       // Hermes Palace
  time: string;       // "06:00"
  distanceToNext: number; // meters; 0 untuk titik terakhir sebelum destinasi
}
```

Tambah field `totalDistanceM: number` (auto-compute) dan `farePerKm: number` (default 1.500 Rp/km, editable). Backward-compat: helper `getPickupNames(rayon)` mengembalikan `string[]` agar UI lama tetap jalan saat migrasi.

## Fare Calculation

Rumus baru pricing:

```
finalfare = (totalDistanceM / 1000) × service.priceMultiplier
```

Optional: **fare per pickup point** — hitung sisa jarak dari titik jemput user sampai destinasi (jadi yang naik di titik terakhir bayar lebih murah). Default OFF; toggle "Per-pickup fare" di admin.

## Admin UI (`/admin/shuttle/rayons`)

Restrukturisasi dialog edit rayon jadi 3 section:

1. **Info Dasar** — ID, Nama, Area, Estimasi, Surcharge (existing).
2. **Tarif per KM** — input `farePerKm` + toggle "Hitung fare per titik jemput" + preview live: "Total jarak: 58,3 km × Rp1.500 = Rp87.450 → dibulatkan Rp87.000".
3. **Titik Jemput & Jarak** — tabel inline dengan kolom: drag-handle, Kode (J1), Nama, Jam, Jarak ke Berikutnya (m), Aksi. Tombol **Tambah Titik** di bawah. Total jarak auto-update di footer tabel. Validasi: titik terakhir = destinasi (auto-add jika tidak ada).

Tambahan UX:

- Tombol **"Seed dari PYU-GO"** di header → satu klik isi 4 rayon dari foto (overwrite confirm dialog).
- Card ringkasan di atas table list: total titik, total jarak gabungan, rata-rata fare per rayon.
- Kolom baru di table list: **Total Jarak (km)** & **Estimasi Fare** (untuk vehicle reguler termurah, sebagai sanity check).

## User Shuttle Integration

- `**ShuttleRayon**`: tampilkan jam pickup di samping nama tiap titik (chip jadi 2 baris: nama + jam). Tampilkan info "±58 km" di header.
- `**ShuttleService` & `ShuttleVehicle**`: `calcPrice` Fare Calculation
  Rumus baru pricing:
  ```
  finalfare = (totalDistanceM / 1000) × service.priceMultiplier.
  ```
- `**ShuttleBooking**`: di summary breakdown harga sebut komponen jarak.

## File Changes

**EDIT:**

- `src/modules/shuttle/data/rayons.ts` — `PickupPoint` interface, `farePerKm`, helper `getTotalDistanceM(rayon)`, `getPickupNames(rayon)`, seed 4 rayon dari foto.
- `src/modules/shuttle/data/services.ts` — `calcPrice(vehicle, service, rayon, pickupCode?)` dengan komponen jarak + helper `calcFareBreakdown()`.
- `src/modules/admin/pages/AdminRayons.tsx` — 3-section dialog, inline pickup table, tombol Seed, ringkasan total jarak & estimasi fare.
- `src/modules/shuttle/pages/ShuttleRayon.tsx` — chip pickup tampilkan jam, header pakai total jarak.
- `src/modules/shuttle/pages/ShuttleService.tsx` & `ShuttleVehicle.tsx` — pakai `calcPrice` baru, tooltip breakdown.
- `src/modules/shuttle/pages/ShuttleBooking.tsx` — breakdown harga di summary.
- `src/modules/admin/pages/AdminDashboard.tsx` — checklist tambah item "Pickup points & jarak terisi".

## Migration

`getRayons()` di-wrap dengan `migrateRayon()` yang konversi `pickupPoints: string[]` lama → `PickupPoint[]` (default time empty, distance 0, code auto J1…). Sekali jalan saat read, lalu cache.

## Hasil

Admin punya data riil PYU-GO 4 rayon dengan jadwal & jarak yang akurat. Fare otomatis proporsional dengan jarak tempuh rayon (Rayon B yang 65 km lebih mahal dari Rayon D 30 km). User lihat jam pickup tiap titik dan rincian fare yang transparan.