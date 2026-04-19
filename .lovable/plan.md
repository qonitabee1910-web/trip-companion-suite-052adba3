

## Analisis Proyek & Plan Integrasi Database
<lov-tool-use id="toolu_vrtx_01UR3NiaJ63mN3etRMMd81Fk" name="code--view" integration-id="code" data="{\"file_path\": \"src/shared/modules.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_014vcSPWDvGwLhS5LmjGodwJ" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/types/booking.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01BvoW7XLfVwo9d4ebwtDrBt" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/data/rayons.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_015tCVJLmK2EEeHP37voaaU6" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/data/services.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Eum681ZKFGRe2i996xZgs1" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/hotel/types.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DcTABhUTN748rW5WRj3Nen" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/data/inventory.ts\", \"lines\": \"1-60\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01UaTLi4dQfpcepm9zfiADHB" name="code--view" integration-id="code" data="{\"file_path\": \"src/App.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LoRb9SwHsiwMchgndKpNUo" name="code--view" integration-id="code" data="{\"file_path\": \"src/shared/modules.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019PCEF9buHL6nqNpvam3QzL" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/types/booking.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017qZd8Vetq4ZBDVRJwjjGCR" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/hotel/types.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CxQh9Ca2T2WUgB6w4JRx93" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/data/rayons.ts\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_011iDNFaVpAs1DPjUgWsi6Mh" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/data/services.ts\", \"lines\": \"1-120\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MEPUYbNCsxXvNMEkQ1uKFo" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/shuttle/data/inventory.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017MPCMQbkSADbQ88VKj9apu" name="code--view" integration-id="code" data="{\"file_path\": \"src/modules/hotel/data/hotels.ts\", \"lines\": \"1-50\"}">
</lov-tool-use>
<lov-plan>

# Plan: Migrasi Data Project ke Database (Lovable Cloud)

## Analisis Status Saat Ini

Database sudah aktif dengan tabel **driver-side** (`profiles`, `user_roles`, `drivers`, `driver_locations`, `rides`, `shuttle_trips`). Namun **mayoritas data project masih di localStorage / hardcoded TS**:

| Domain | Lokasi sekarang | Status DB |
|---|---|---|
| Shuttle: rayons + pickup points | `rayons.ts` + localStorage `shuttle-admin:rayons` | belum |
| Shuttle: services (tier) | `services.ts` + localStorage | belum |
| Shuttle: vehicle types + tierPrices | `services.ts` + localStorage | belum |
| Shuttle: seat layouts | `seatLayouts.ts` + localStorage | belum |
| Shuttle: bookings | localStorage `shuttle-admin:bookings` | belum |
| Shuttle: inventory blocked seats | localStorage | belum |
| Shuttle: depart times, destination, content | localStorage | belum |
| Hotels (katalog + rooms) | `hotels.ts` hardcoded | belum |
| Hotel bookings | tidak ada | belum |
| Rides table | sudah di DB | ✓ |
| Shuttle_trips | sudah di DB (kosong, belum dipakai admin) | ✓ |

Masalah: data hanya hidup di browser tiap user → tidak bisa share antar device, admin & customer lihat data berbeda, refresh kadang hilang.

## Tujuan

Pindahkan **semua data persisten** (yang saat ini di localStorage / hardcoded) ke database Lovable Cloud, dengan RLS yang aman, dan seed default agar app langsung bisa dipakai.

## Schema Baru yang Akan Dibuat

```text
-- SHUTTLE master data (admin-managed, public read)
rayons              (id text PK, name, area, color, estimate_min, surcharge, fare_per_km, sort_order, active)
pickup_points       (id uuid, rayon_id FK, code, name, time, distance_to_next, lat, lng, sort_order)
services            (tier text PK, label, description, price_multiplier, features text[], active)
vehicle_types       (id text PK, label, vehicle_name, description, tier_prices jsonb, active)
seat_layouts        (id uuid, vehicle_id, tier, layout jsonb, capacity, base_price, updated_at)
                    UNIQUE(vehicle_id, tier)
depart_times        (id uuid, time text, sort_order)
shuttle_settings    (key text PK, value jsonb)   -- destination, content, dll (single-row pattern)

-- SHUTTLE transactional
shuttle_bookings    (id uuid, code text unique, rayon_id, pickup, date, time, vehicle_id,
                     service_tier, seats int[], pax, unit_price, total_price,
                     customer_name, customer_phone, customer_id uuid null, status, created_at)
seat_blocks         (id uuid, date, time, rayon_id, vehicle_id, tier, seat_number int, reason)

-- HOTEL master + transactional
hotels              (id uuid, name, city, address, stars, rating, review_count, price_per_night,
                     original_price, images text[], amenities text[], description, lat, lng, active)
room_types          (id uuid, hotel_id FK, name, capacity, bed, price, breakfast, refundable, sort_order)
hotel_bookings      (id uuid, code, hotel_id, room_type_id, check_in, check_out, guests, rooms,
                     customer_name, customer_phone, customer_id uuid null, total_price, status, created_at)
```

### RLS Strategy

- **Master data (rayons, pickup_points, services, vehicle_types, seat_layouts, depart_times, shuttle_settings, hotels, room_types)**: SELECT publik (`true`) supaya guest bisa browse/booking. INSERT/UPDATE/DELETE hanya `has_role('admin')`.
- **shuttle_bookings, hotel_bookings**: 
  - INSERT publik (guest checkout) — validasi field via trigger.
  - SELECT: admin semua; user lihat by `customer_phone` lookup atau `customer_id = auth.uid()`.
  - UPDATE/DELETE: admin only (cancel oleh user via UPDATE status saja kalau `customer_id = auth.uid()`).
- **seat_blocks**: SELECT publik (untuk seat map), write admin only.

### Seeding

Migration menyertakan seed default dari file TS saat ini:
- `SEED_RAYONS_PYUGO` (5 rayons + ~80 pickup points)
- `SERVICES` (3 tier)
- `VEHICLE_TYPES` (3 vehicles dengan tierPrices)
- `LAYOUT_PRESETS` per (vehicle × tier)
- `DEPART_TIMES`
- `HOTELS` + rooms
- `DEFAULT_DESTINATION`, `DEFAULT_CONTENT` di `shuttle_settings`

## Refactor Code

### Repository pattern (async)

Convert sync localStorage helpers di `src/modules/shuttle/data/repository.ts` → **async functions** yang query Supabase. Contoh:
```ts
export async function getRayons(): Promise<Rayon[]> { ... supabase.from('rayons').select(...) }
export async function addBooking(b): Promise<ShuttleBooking> { ... supabase.from('shuttle_bookings').insert(...) }
```
Tambah `useRayons()`, `useBookings()`, dll. hooks dengan React Query untuk caching + realtime.

### Hotel repo baru
Buat `src/modules/hotel/data/repository.ts` paralel — replace hardcoded `HOTELS` import.

### UI updates
- Halaman admin (`AdminRayons`, `AdminServices`, `AdminVehicles`, `AdminBookings`, `AdminInventory`, `AdminShuttleContent`, `AdminSeatEditor`) → switch ke async fetch + mutate.
- Halaman customer (`ShuttleHome`, `ShuttleSearch`, `ShuttleRayon`, `ShuttleVehicle`, `ShuttleService`, `ShuttleBooking`, `HotelHome`, `HotelSearch`, `HotelDetail`, `HotelBooking`) → fetch dari DB.
- Loading & error states (skeleton + toast).
- File `rayons.ts`, `services.ts`, `seatLayouts.ts`, `hotels.ts` tetap dipertahankan sebagai **types + seed source** (dipakai migration & fallback dev), tapi tidak lagi jadi runtime store.

### Migrasi data localStorage existing
Tambah util one-shot `migrateLocalToCloud()` di admin panel (tombol "Sinkronkan data lokal"). Karena saat ini belum ada user real, opsional — bisa dilewati.

## Dependency Tambahan

Tidak perlu library baru — `@supabase/supabase-js` sudah ada. Akan tambah `@tanstack/react-query` provider kalau belum ada (cek `App.tsx` — sudah ada `QueryClientProvider`, jadi reuse).

## Yang TIDAK Termasuk

- Hotel booking flow penuh dengan payment (hanya simpan booking).
- Migrasi otomatis data localStorage user (manual button saja).
- Multi-tenant / multi-city scope.
- File storage (gambar hotel tetap pakai URL Unsplash).

## Urutan Implementasi

1. **Migration SQL** — buat semua tabel + RLS + seed data.
2. **Repository async** — refactor `shuttle/data/repository.ts` + buat `hotel/data/repository.ts`.
3. **React Query hooks** — `useRayons`, `useBookings`, `useHotels`, dst.
4. **Refactor halaman admin** satu per satu (rayons → services → vehicles → seat-editor → bookings → inventory → content).
5. **Refactor halaman customer** (shuttle flow → hotel flow).
6. **QA**: buka flow booking shuttle dari guest, cek admin lihat booking yang sama, cek edit rayon dari admin langsung muncul di customer.

## Hasil

Semua data shared, persisten di cloud. Admin di laptop edit rayon → customer di HP langsung lihat. Booking guest masuk ke DB dan tampil di `/admin/shuttle/bookings`. Hotel & rooms editable lewat DB (bisa lanjut ke admin hotel page nanti). Driver app tetap jalan seperti sekarang.

