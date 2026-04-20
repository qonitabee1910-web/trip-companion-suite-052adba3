

## Plan: Restrict Route Access by Role

### Problem
Sekarang banyak route sensitif yang tidak dilindungi atau hanya dilindungi via guard ad-hoc di dalam komponen (mis. `DriverHome` cek role manual via `useEffect`). Akibatnya:
- `/admin/*` bisa diakses siapa saja → dapatkan dashboard kosong / error RLS
- `/driver/profile`, `/driver/shuttle`, `/driver/ride/:id` tidak ada role gate
- `/shuttle/profile`, `/shuttle/my-bookings` tidak ada auth gate
- Guard manual di komponen = duplikasi + race condition (loading state tidak konsisten)

### Solusi
Gunakan komponen `RequireAuth` yang sudah ada (`src/shared/auth/RequireAuth.tsx`) di **lapisan registry**, supaya proteksi konsisten dan deklaratif lewat manifest tiap modul.

### 1. Extend Module System

**Edit `src/shared/moduleSystem.ts`** — tambah field opsional `requireAuth` dan `requireRole` di tipe route:
```ts
export interface ModuleRoute {
  path: string;
  element: ReactNode;
  requireAuth?: boolean;          // wajib login
  requireRole?: AppRole;          // wajib role tertentu (implisit requireAuth)
}
```

**Edit `src/shared/moduleRegistry.ts`** — di `getAllPublicRoutes()` & `getAllAdminRoutes()`, otomatis bungkus `element` dengan `<RequireAuth role={...}>` kalau `requireRole` di-set, atau `<RequireAuth>` saja kalau `requireAuth: true`. Admin routes default-nya `requireRole: "admin"` (tanpa perlu di-set per route).

### 2. Tag Routes per Modul

**`src/modules/driver/index.ts`** — semua route driver kecuali `/driver/login` dapat `requireRole: "driver"`:
```
/driver                  → requireRole: "driver"
/driver/profile          → requireRole: "driver"
/driver/ride/:id         → requireRole: "driver"
/driver/shuttle(/:id)    → requireRole: "driver"
/driver/login            → public
```

**`src/modules/shuttle/index.ts`** — gate route customer:
```
/shuttle/profile         → requireAuth
/shuttle/my-bookings     → requireAuth
/shuttle/login           → public (redirect ke /auth)
sisanya (browse/booking) → public
```

**`src/modules/admin/index.ts`** — admin routes otomatis di-gate `requireRole: "admin"` oleh registry. `/admin/login` tetap public.

**`src/modules/auth/index.ts`** — semua public.

### 3. Hapus Guard Manual yang Duplikat

**`DriverHome.tsx`** — hapus blok `useEffect` yang cek session + role manual (lines ~32-55) karena `<RequireAuth role="driver">` sudah menangani. Tetap ambil `userId` dari `useAuth()` context.

**`AdminLayout.tsx`** — tidak butuh perubahan (sudah di balik gate registry).

**`MyBookings.tsx` & `CustomerProfile.tsx`** — kalau ada cek manual session, hapus, karena sudah di-gate.

### 4. Improvement UX

**`RequireAuth.tsx`** — sudah ada, tapi tambahkan toast saat redirect karena role mismatch supaya user tahu kenapa di-bounce ke `/`. Contoh: "Akses ditolak. Halaman ini hanya untuk Driver."

**`AdminLogin.tsx`** — kalau user sudah login & punya role admin → auto-redirect ke `/admin`. Kalau login tapi bukan admin → tampilkan tombol "Logout & Login ulang". (Sudah sebagian ada di refreshStatus, akan dirapikan.)

### 5. (Opsional) Verification Gate untuk Driver

Driver yang `verification_status !== 'verified'` boleh masuk `/driver/profile` (untuk upload dokumen) tapi **tidak boleh** akses `/driver` (home/online toggle) maupun `/driver/ride/:id`. Tambah varian `<RequireAuth role="driver" requireVerified>` yang baca `drivers.verification_status` via context (tambah ke `AuthProvider` saat user punya role driver). Kalau belum verified → redirect ke `/driver/profile` + toast.

### File Summary

**EDIT**
- `src/shared/moduleSystem.ts` — tambah field `requireAuth`/`requireRole` di tipe route
- `src/shared/moduleRegistry.ts` — auto-wrap element dengan `<RequireAuth>` saat flatten routes; admin routes default require admin
- `src/shared/auth/RequireAuth.tsx` — toast saat role mismatch + dukung `requireVerified`
- `src/shared/auth/AuthProvider.tsx` — load `driverProfile.verification_status` saat user punya role driver
- `src/modules/driver/index.ts` — tag route dengan `requireRole: "driver"` (+ `requireVerified` untuk home & ride)
- `src/modules/shuttle/index.ts` — tag `/shuttle/profile` & `/shuttle/my-bookings` dengan `requireAuth`
- `src/modules/auth/index.ts` — eksplisit public (no-op)
- `src/modules/driver/pages/DriverHome.tsx` — hapus guard manual
- `src/modules/admin/pages/AdminLogin.tsx` — auto-redirect kalau sudah admin

**Tidak ada migration DB**: semua RLS sudah benar. Ini murni client-side route guarding (UX), RLS tetap jadi backstop.

### Hasil
- Akses `/admin/*` tanpa role admin → redirect ke `/` + toast "Akses ditolak"
- Akses `/driver/*` tanpa role driver → redirect ke `/auth?role=driver`
- Akses `/shuttle/profile` tanpa login → redirect ke `/auth?from=/shuttle/profile`
- Driver belum verified tidak bisa go-online (bounced ke profile untuk upload SIM/STNK)
- Tidak ada lagi guard logic duplikat di dalam page; semua deklaratif di manifest

