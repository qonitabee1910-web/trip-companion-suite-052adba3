

## Plan: Refactor Harga Tiket User Shuttle — Dinamis & Database-Driven

### Akar Masalah (3 lapis)

**1. Halaman `/shuttle/search` legacy = dead code yang menyesatkan**
File `ShuttleSearch.tsx` masih pakai `SHUTTLES` hardcoded (Jakarta-Bandung, Cipaganti dll) dengan `price` static. Tidak nyambung ke fare calc, tidak nyambung DB. Flow user yang asli: Home → Rayon → Service → Vehicle → Book. Halaman ini perlu dihapus/redirect.

**2. Data DB rusak → harga jadi 0**
Query DB membuktikan:
- `services.price_multiplier` = **0** untuk semua tier (harusnya 1.0 / 1.4 / 1.8)
- `vehicle_types.tier_prices`: HiAce reguler = **0**, SUV & MiniCar **semua tier = 0**

Akibat di formula `calcFareBreakdown`:
```
serviceFare = distanceFare × 0 = 0
basePrice   = 0 (untuk SUV/Mini)
total       = round(0 + 0 + surcharge=0) = Rp 0
```
User lihat **"Rp 0"** atau angka aneh di Service & Vehicle page.

**3. Breakdown harga tersembunyi sampai step terakhir**
Di `ShuttleService` & `ShuttleVehicle` cuma muncul angka total tanpa konteks. Padahal `calcFareBreakdown` sudah expose: jarak, tarif/km, multiplier, surcharge. User tidak tahu kenapa harganya segitu → trust rendah.

### Solusi

**A. Seed data DB yang valid (migration data fix)**
- Update `services.price_multiplier`: reguler=1.0, semi=1.4, exec=1.8
- Update `vehicle_types.tier_prices` ke default sehat:
  - HiAce: 120k / 160k / 220k
  - SUV: 180k / 230k / 300k  
  - MiniCar: 95k / 130k / 175k
- Pakai `UPDATE` lewat insert tool (bukan migration schema).

**B. Hapus / redirect halaman `/shuttle/search` legacy**
- Hapus route `/shuttle/search` + import di `App.tsx`.
- Hapus file `ShuttleSearch.tsx` dan `ShuttleSearchForm.tsx` (jika tidak dipakai di tempat lain — cek dulu).
- Hapus `SHUTTLES` dummy dari `data/shuttles.ts` (atau kosongkan file).

**C. Komponen baru: `<FareBreakdownCard>` reusable**
Lokasi: `src/modules/shuttle/components/FareBreakdownCard.tsx`. Props:
```ts
{ vehicle, service, rayon, pickupCode?, pax, compact? }
```
Render breakdown rapi:
```
Jarak 12.4 km × Rp1.500    Rp 18.600
Multiplier Semi ×1.4       Rp  7.440
Harga dasar HiAce Semi     Rp160.000
Surcharge                  Rp     0
─────────────────────────
Per kursi                  Rp186.000
× 2 pax                    Rp372.000
```
Mode `compact` = baris ringkas untuk Service/Vehicle list.

**D. Integrasikan ke 3 halaman user**
1. **`ShuttleService.tsx`** — di tiap card service, ganti "mulai dari Rp X" jadi mini fare hint: "Rp X (HiAce, ±12 km)" + tooltip/popover berisi `<FareBreakdownCard compact>` saat user tap info icon.
2. **`ShuttleVehicle.tsx`** — di tiap card vehicle, expand dengan accordion "Lihat rincian tarif" → `<FareBreakdownCard>` full. Tampilkan unit price + total pax langsung.
3. **`ShuttleBooking.tsx`** — refactor blok "Rincian tarif" inline jadi pakai `<FareBreakdownCard>` (sekarang sudah ada inline, tapi duplikat logic).

**E. Live recompute saat data DB berubah (realtime)**
Karena cache `cloudCache.services/vehicles/rayons` sudah punya subscriber via `notifyStore`, tambahkan hook `useCloudSnapshot()` di setiap halaman pricing supaya fare otomatis recompute saat admin edit multiplier/tarif tanpa perlu refresh user.

### File yang Disentuh

- **DB seed (insert tool)** — update `services.price_multiplier` & `vehicle_types.tier_prices`.
- **`src/App.tsx`** — hapus route + import `ShuttleSearch`.
- **DELETE `src/modules/shuttle/pages/ShuttleSearch.tsx`** dan **`src/modules/shuttle/components/ShuttleSearchForm.tsx`** (verifikasi tidak dipakai elsewhere).
- **`src/modules/shuttle/data/shuttles.ts`** — kosongkan / hapus `SHUTTLES`.
- **NEW `src/modules/shuttle/components/FareBreakdownCard.tsx`** — komponen reusable.
- **NEW `src/modules/shuttle/hooks/useCloudSnapshot.ts`** — re-render hook subscribe `notifyStore`.
- **`src/modules/shuttle/pages/ShuttleService.tsx`** — pakai `FareBreakdownCard compact` + hook.
- **`src/modules/shuttle/pages/ShuttleVehicle.tsx`** — accordion breakdown + hook.
- **`src/modules/shuttle/pages/ShuttleBooking.tsx`** — replace inline breakdown dengan komponen.

### Tidak Termasuk

- Tidak menambah field harga baru di DB (struktur sudah cukup).
- Tidak ubah fare formula — hanya expose detail ke user.
- Tidak migrasi `tier_prices` per-rayon (kalau perlu nanti, bisa fitur lanjutan).

### Hasil

- Harga di Service & Vehicle page **akurat & tidak Rp 0** lagi (fix data DB).
- User lihat **breakdown transparan**: jarak × tarif/km, multiplier, base, surcharge → naik trust.
- Admin edit `price_multiplier` di `/admin/shuttle/services` → user di tab lain langsung lihat harga update **tanpa refresh** (realtime).
- Halaman `/shuttle/search` legacy hilang → tidak ada lagi entry point dummy yang bikin user bingung.

