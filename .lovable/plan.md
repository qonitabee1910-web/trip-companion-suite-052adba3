

# Plan: Driver App Module untuk PYU-GO

## Konsep

Module Driver baru di `/driver` untuk mitra pengemudi PYU-GO yang bisa terima request **Ride** (real-time) dan menjalankan **Shuttle Trip** sesuai jadwal. Realtime via Supabase Postgres Changes + driver location update tiap 5 detik.

## Prasyarat: Lovable Cloud

Module ini butuh backend (auth driver, tabel rides + driver_locations, realtime channel). Akan **aktifkan Lovable Cloud** dan buat schema. Tidak perlu API key eksternal.

## Database Schema (migrations)

```text
profiles              (id uuid PK = auth.users.id, full_name, phone, photo_url)
user_roles            (user_id, role enum: 'driver'|'rider'|'admin')  -- pakai pattern has_role
drivers               (id uuid PK = auth.users.id, vehicle_type, plate, rating, is_online bool, current_lat, current_lng, updated_at)
driver_locations      (id, driver_id, lat, lng, heading, recorded_at)  -- log/history
rides                 (id, rider_id, driver_id nullable, status enum:
                       'pending'|'accepted'|'rejected'|'arriving'|'in_progress'|'completed'|'cancelled',
                       pickup_lat, pickup_lng, pickup_name,
                       dest_lat, dest_lng, dest_name,
                       ride_type, fare, distance_km,
                       requested_at, accepted_at, started_at, completed_at)
shuttle_trips         (id, driver_id, rayon_id, vehicle_id, service_tier,
                       depart_at, status enum: 'scheduled'|'boarding'|'in_progress'|'completed'|'cancelled',
                       current_pickup_index int)
```

RLS:
- Driver bisa SELECT/UPDATE rides di mana `driver_id = auth.uid()` ATAU status='pending' (untuk lihat request masuk).
- Driver bisa UPDATE drivers row sendiri.
- Driver INSERT driver_locations row sendiri.
- Realtime publication ON untuk `rides` dan `drivers`.

## Struktur File

```text
src/modules/driver/
├── pages/
│   ├── DriverHome.tsx          # online toggle, map, status, daftar trip aktif
│   ├── DriverLogin.tsx         # email/password login (Lovable Cloud auth)
│   ├── DriverRideRequest.tsx   # modal/screen untuk incoming ride (accept/reject)
│   ├── DriverActiveRide.tsx    # navigation pickup → trip → complete
│   └── DriverShuttleTrip.tsx   # daftar shuttle trip + start/complete per pickup
├── components/
│   ├── OnlineToggle.tsx
│   ├── DriverMap.tsx           # Leaflet, marker driver + pickup/dest
│   └── IncomingRideSheet.tsx   # bottom sheet auto-muncul saat ada request
├── hooks/
│   ├── useDriverLocation.ts    # geolocation watcher + push ke Supabase /5s
│   ├── useIncomingRides.ts     # realtime subscribe rides where status=pending
│   └── useActiveRide.ts        # subscribe perubahan ride driver
└── data/
    └── driver.ts               # types + helpers
```

Routes baru di `App.tsx`:
- `/driver/login`
- `/driver` (home, protected)
- `/driver/ride/:id`
- `/driver/shuttle/:id`

Tambah modul "Driver" ke `src/shared/modules.ts`.

## Realtime Strategy

**Incoming requests** (`useIncomingRides`):
```ts
supabase.channel('driver-incoming')
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
      handleNewRide)
  .subscribe();
```
Filter klien tambahan: jarak driver ↔ pickup < 5km.

**Active ride** (`useActiveRide`): subscribe UPDATE pada row ride spesifik (status changes oleh rider/cancel).

**Location push** (`useDriverLocation`):
- `navigator.geolocation.watchPosition`
- Throttle: kirim ke `drivers` table + insert `driver_locations` setiap 5 detik (hanya saat `is_online=true`).
- Saat sedang `in_progress` ride, frequency naik jadi 3 detik.

## UI Screens

1. **DriverHome**: Map fullscreen, header dengan foto+nama+rating, **toggle Online/Offline besar** di bawah, statistik hari ini (trip count, earnings mock), banner "Menunggu request..." saat online.
2. **IncomingRideSheet**: Auto-popup bottom sheet — pickup, dest, jarak, fare, countdown 15s, tombol **Tolak** & **Terima** (besar, hijau).
3. **DriverActiveRide**: 3 phase
   - *Menjemput*: tombol "Sudah sampai" → status `arriving`
   - *Mulai trip*: tombol "Mulai Perjalanan" → `in_progress`
   - *Selesai*: tombol "Selesaikan" → `completed`, summary fare.
4. **DriverShuttleTrip**: Daftar pickup point dengan tombol "Tiba di [titik]" / "Berangkat ke titik berikutnya", final "Selesai trip".
5. **DriverLogin**: Email+password, default redirect ke `/driver`.

## Map Component

`DriverMap.tsx` reuse pattern dari `RideHome.tsx` & `MiniMap.tsx`:
- Marker driver (icon mobil) di posisi current.
- Saat ada active ride: marker pickup + dest + polyline.
- Auto-center ke driver.

## Auth & Roles

- Saat signup, user dapat row di `profiles` (via trigger).
- Admin assign role 'driver' manual (atau seed 1 driver). Halaman driver gate: cek `has_role(uid, 'driver')` else redirect login.
- Saat aktifkan online, insert/update row `drivers` (PK = uid).

## Fare & Konsistensi

Reuse `RIDE_OPTIONS` dari `src/modules/ride/data/ride.ts` untuk hitung fare di rider side. Server simpan fare final saat ride dibuat.

## Yang Tidak Termasuk (out of scope)

- Rider app yang membuat ride (akan ada seed manual via admin / SQL untuk test).
- Push notification native (cuma in-app realtime).
- Pembayaran. Tracking earnings hanya tampilan agregat dari `rides.completed`.

## Hasil

Driver buka `/driver/login`, login → `/driver`, toggle Online → location mulai dipush ke Supabase tiap 5s → ketika ada ride pending dalam radius, sheet muncul → terima → navigation ke pickup → mulai trip → selesai. Untuk shuttle, daftar trip terjadwal hari ini muncul di tab Shuttle dengan flow per-pickup.

