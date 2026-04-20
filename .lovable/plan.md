

## Plan: Refactor ke Arsitektur Modular Self-Registering

### Masalah Saat Ini

Walau folder `src/modules/*` sudah ada, struktur belum benar-benar modular:

| Masalah | Lokasi | Dampak |
|---|---|---|
| Routes hardcoded semua di `App.tsx` (30+ import) | `src/App.tsx` | Tambah modul = edit App.tsx manual |
| Module registry flat di `shared/modules.ts` | `src/shared/modules.ts` | Tambah modul = edit di 3 tempat (registry, routes, sidebar) |
| `cloudStore.ts` (905 baris) urus shuttle+hotel+booking+seatLayout | `src/modules/shuttle/data/cloudStore.ts` | Cross-module coupling, file susah dimaintain |
| Hotel data import dari folder shuttle | `src/modules/hotel/data/hotels.ts` → `@/modules/shuttle/data/cloudStore` | Hotel bergantung ke shuttle — bukan modular |
| Admin pages campur (semua di `src/modules/admin/pages`) padahal isinya domain shuttle | `AdminRayons`, `AdminVehicles`, `AdminServices`, dll | Admin domain bocor ke folder lain |
| Tidak ada manifest per modul | — | Tidak jelas modul "punya" apa (routes, nav, admin, seed) |

### Target Arsitektur

**Setiap modul self-contained** dengan satu **manifest** yang mendeklarasikan:
- Public routes
- Admin routes
- Entry di home grid (icon, label, color)
- Entry di bottom nav (opsional)
- Hook hydrate data (opsional)

```
src/modules/<name>/
  index.ts              ← module manifest (registry entry-point)
  pages/                ← public pages
  admin/                ← admin pages + sidebar items milik modul
  components/
  data/                 ← repository + types khusus modul
  hooks/
```

**Module registry** otomatis collect semua manifest → generate routes, home grid, admin sidebar.

### Perubahan Konkret

**1. Buat tipe & loader manifest baru**
- `src/shared/moduleSystem.ts` — tipe `AppModule`:
  ```ts
  interface AppModule {
    id: string;
    label: string;
    icon: LucideIcon;
    color: ModuleColor;
    enabled: boolean;
    homeEntry?: { path: string; order?: number };
    routes: Array<{ path: string; element: ReactNode }>;
    adminRoutes?: Array<{ path: string; element: ReactNode; sidebar?: { label: string; icon: LucideIcon; group?: string } }>;
    hydrate?: () => Promise<void>;  // dipanggil oleh CloudGate
  }
  ```
- `src/shared/moduleRegistry.ts` — array `MODULES: AppModule[]` (gantikan `shared/modules.ts` lama, kompatibel mundur via re-export `MODULES` shape lama untuk `Home.tsx`).

**2. Buat `index.ts` (manifest) per modul**
- `src/modules/hotel/index.ts`
- `src/modules/shuttle/index.ts`
- `src/modules/ride/index.ts`
- `src/modules/driver/index.ts`
- `src/modules/admin/index.ts` (admin = "shell" yang mengumpulkan adminRoutes dari modul lain)

Setiap manifest export `default` AppModule + lazy import pages-nya.

**3. Refactor `App.tsx`**
- Hapus 30+ import individual.
- Loop `MODULES` → render `<Route>` untuk public + admin routes.
- Hanya 1 import: `import { MODULES } from "@/shared/moduleRegistry"`.
- Sisain hanya routes generic (`/`, `*` NotFound, login).

**4. Pindahkan admin pages domain-specific ke modulnya**
- `AdminRayons`, `AdminServices`, `AdminVehicles`, `AdminBookings`, `AdminScan`, `AdminSeatEditor`, `AdminShuttleContent`, `AdminInventory` → `src/modules/shuttle/admin/`
- `AdminDashboard`, `AdminLogin`, `AdminSidebar` → tetap di `src/modules/admin/` (shell).
- Update import paths.
- `AdminSidebar` jadi dinamis: baca `adminRoutes[*].sidebar` dari semua module manifests.

**5. Pecah `cloudStore.ts` per domain**
- `src/modules/shuttle/data/cloudStore.ts` — hanya rayons, services, vehicles, departTimes, destination, content, bookings, seatBlocks, seatLayouts.
- `src/modules/hotel/data/cloudStore.ts` — hanya hotels (hydrate, mutations, realtime channel).
- `src/shared/cloudCore.ts` — utilitas shared: `notify`, listener pattern, `useCloudSnapshot` factory.
- `CloudGate` panggil `module.hydrate?.()` untuk semua module yang punya hydrate, parallel.
- `src/modules/hotel/data/hotels.ts` import dari hotel cloudStore sendiri (bukan shuttle).

**6. Update `Home.tsx` & `BottomNav`**
- `Home.tsx` baca `MODULES` baru, filter `m.homeEntry` ada → render grid.
- `BottomNav` baca dari registry juga (modul yang punya `bottomNav: true` muncul di tab).

### File Summary

**NEW**
- `src/shared/moduleSystem.ts` (types)
- `src/shared/moduleRegistry.ts` (collect all manifests)
- `src/shared/cloudCore.ts` (extracted notify/listener pattern)
- `src/modules/hotel/index.ts`
- `src/modules/hotel/data/cloudStore.ts`
- `src/modules/shuttle/index.ts`
- `src/modules/ride/index.ts`
- `src/modules/driver/index.ts`
- `src/modules/admin/index.ts`
- `src/modules/shuttle/admin/` (folder, isi pindahan)

**EDIT**
- `src/App.tsx` — drastically simpler (loop modules untuk routes)
- `src/modules/shuttle/data/cloudStore.ts` — buang hotel-related code
- `src/modules/hotel/data/hotels.ts` — pakai hotel cloudStore sendiri
- `src/shared/components/CloudGate.tsx` — panggil `Promise.all(modules.map(m => m.hydrate?.()))`
- `src/modules/admin/components/AdminSidebar.tsx` — render dinamis dari registry
- `src/pages/Home.tsx` — pakai registry baru (struktur sama, source berubah)
- `src/shared/modules.ts` — DELETE (digantikan moduleRegistry)
- `src/shared/components/BottomNav.tsx` — pakai registry

### Tidak Termasuk
- Tidak migrasi ke React.lazy/code-splitting (bisa fitur lanjutan; lazy-load per modul).
- Tidak ubah skema database.
- Tidak refactor logika business (fare calc, booking flow) — hanya struktur file/import.
- Tidak ubah routes URL — backward compatible.

### Hasil

Tambah modul baru cukup:
1. Bikin folder `src/modules/<name>/` dengan `index.ts` + pages.
2. Daftarkan di `moduleRegistry.ts` (1 baris import + push).
3. **Selesai** — routes, home grid, admin sidebar, hydrate semua otomatis.

`App.tsx` ~110 baris → ~30 baris. `cloudStore.ts` 905 baris terpecah jadi 2 file domain ~400 baris masing-masing. Cross-module import (hotel→shuttle) hilang.

