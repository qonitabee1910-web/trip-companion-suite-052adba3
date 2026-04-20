

## Plan: Modul Auth Terpadu + Profile Page per Role

### Arsitektur

```text
src/shared/auth/                   ← shared auth core (NEW)
  AuthProvider.tsx                 ← context: session, user, roles, ready
  useAuth.ts                       ← hook: { user, roles, isCustomer, isDriver, isAdmin }
  useRequireRole.ts                ← gate hook: redirect kalau role tidak match
  RequireAuth.tsx                  ← komponen wrapper untuk protected routes
  authApi.ts                       ← signUp/signIn/signOut/resetPassword/uploadAvatar
  storageBuckets.ts                ← bucket constants

src/modules/auth/                  ← modul auth terpadu (NEW)
  pages/AuthPage.tsx               ← /auth — login/signup, pilih role saat signup
  pages/ResetPasswordPage.tsx      ← /reset-password
  pages/ForgotPasswordPage.tsx     ← /forgot-password (atau inline di /auth)
  index.ts                         ← manifest

src/modules/shuttle/pages/
  CustomerProfile.tsx              ← /shuttle/profile (NEW)

src/modules/driver/pages/
  DriverProfile.tsx                ← /driver/profile (NEW)
```

### 1. Database Migration

```sql
-- Tambah kolom profil ke profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS bio text;

-- Tambah kolom dokumen ke drivers (untuk SIM/STNK + verifikasi)
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS sim_url text,
  ADD COLUMN IF NOT EXISTS stnk_url text,
  ADD COLUMN IF NOT EXISTS sim_expiry date,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('driver-documents', 'driver-documents', false)
ON CONFLICT DO NOTHING;

-- RLS avatars: public read, owner write
CREATE POLICY "Avatars publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS driver-documents: owner only + admin read
CREATE POLICY "Drivers manage own docs" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admin read driver docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents' AND has_role(auth.uid(), 'admin'));
```

Note: tidak buat tabel terpisah untuk roles — `user_roles` sudah ada. Trigger `handle_new_user` sudah auto-create profile.

### 2. Shared Auth Core

**`AuthProvider.tsx`** — context provider yang dipasang di App.tsx, expose:
- `session`, `user`, `profile`, `roles[]`, `loading`
- Listener `onAuthStateChange` (set up SEBELUM `getSession()` per best-practice)
- Auto-refetch roles saat session berubah

**`useAuth.ts`** — hook utama: `{ user, profile, roles, isCustomer, isDriver, isAdmin, signOut }`

**`RequireAuth.tsx`** — wrapper component:
```tsx
<RequireAuth role="driver" redirectTo="/auth?role=driver">
  <DriverHome />
</RequireAuth>
```
Kalau belum login → redirect ke /auth dengan `from` state. Kalau login tapi role salah → redirect ke home + toast.

**`authApi.ts`** — fungsi-fungsi:
- `signUpWithRole(email, password, fullName, role)` → signUp + insert ke user_roles + (kalau driver) insert ke drivers row
- `signIn(email, password)`
- `signOut()`
- `requestPasswordReset(email)`
- `updatePassword(newPassword)`
- `uploadAvatar(file)` → upload ke `avatars/{uid}/avatar.{ext}` + update profile.photo_url
- `uploadDriverDoc(file, type: 'sim'|'stnk')` → upload ke `driver-documents/{uid}/...`

### 3. Halaman /auth (Terpadu)

**`AuthPage.tsx`** — single page dengan tabs Login | Sign Up:
- Mode Login: email + password + tombol "Lupa password?"
- Mode Sign Up: nama lengkap + email + password + **role selector** (Customer / Driver) + phone (opsional, wajib untuk driver)
- Setelah signUp:
  - Insert ke `user_roles` (role pilihan)
  - Kalau driver → ensure drivers row ada (dengan vehicle_type & plate placeholder, edit kemudian di profile)
- Setelah signIn:
  - Baca roles → redirect:
    - driver → `/driver`
    - admin → `/admin`
    - customer (default) → query param `?from=` atau `/shuttle`
- Branding: pakai card center, logo PYU-GO, switcher tab clean

URL params:
- `/auth?role=driver` → pre-select tab Driver di signup
- `/auth?from=/shuttle/my-bookings` → redirect setelah login

**Existing pages (`CustomerLogin`, `DriverLogin`, `AdminLogin`)**:
- Hapus `CustomerLogin` & `DriverLogin` (route redirect ke `/auth`)
- `AdminLogin` tetap ada di `/admin/login` (karena perlu UI grant_admin), tapi pakai shared auth core

### 4. Forgot/Reset Password

- Tombol "Lupa password?" di /auth → `ForgotPasswordPage` atau modal inline → `resetPasswordForEmail({ redirectTo: ${origin}/reset-password })`
- `ResetPasswordPage` di `/reset-password` (PUBLIC route):
  - Cek `type=recovery` di URL hash
  - Form: password baru + konfirmasi
  - `supabase.auth.updateUser({ password })` → toast → redirect ke /auth

### 5. Profile Pages

**`CustomerProfile.tsx` — `/shuttle/profile`** (RequireAuth):
- Header: avatar besar (clickable upload), nama, email
- Form: full_name, phone, address, bio
- Tombol: "Ubah password" → modal
- Tombol: "Logout"
- Section **Statistik**: total booking, total spend (query `shuttle_bookings` + `hotel_bookings` where customer_id = uid)
- Section **Riwayat singkat**: 3 booking terakhir + link "Lihat semua" → /shuttle/my-bookings

**`DriverProfile.tsx` — `/driver/profile`** (RequireAuth role=driver):
- Header: avatar, nama, rating ⭐, badge verifikasi (pending/verified/rejected)
- Form: full_name, phone, address
- Section **Kendaraan**: vehicle_type (select), plate (input)
- Section **Dokumen**: upload SIM (image/pdf) + tanggal kadaluarsa, upload STNK; preview thumbnail; status verifikasi
- Section **Statistik**: total trip, rating, earning hari ini/minggu/bulan (query `rides` completed + sum fare)
- Tombol: "Ubah password", "Logout"

**Admin verifikasi dokumen** (small bonus): kolom `verification_status` bisa di-update lewat AdminInventory atau page baru — tapi *out of scope* untuk implementasi ini, struktur saja siap.

### 6. Routing & Navigation Update

**Buat `src/modules/auth/index.ts`** — manifest dengan routes `/auth`, `/forgot-password`, `/reset-password`. Daftarkan di `moduleRegistry.ts`.

**Update `driver/index.ts`** — tambah `/driver/profile` (lazy). Wrap `/driver` dengan `<RequireAuth role="driver">`.

**Update `shuttle/index.ts`** — tambah `/shuttle/profile`. Update `/shuttle/my-bookings` & `/shuttle/login` (rute /shuttle/login redirect ke /auth).

**Update `App.tsx`** — wrap `<Routes>` dengan `<AuthProvider>`.

**Navigation entry points**:
- `ShuttleHome.tsx`: tombol/icon profile di header (kalau login → /shuttle/profile, kalau tidak → /auth)
- `DriverHome.tsx`: avatar di header → /driver/profile (replace logout button, logout di dalam profile)
- `BottomNav` (kalau ada): tab Profile

### 7. File Summary

**NEW**
- `src/shared/auth/AuthProvider.tsx`, `useAuth.ts`, `useRequireRole.ts`, `RequireAuth.tsx`, `authApi.ts`, `index.ts`
- `src/modules/auth/pages/AuthPage.tsx`, `ResetPasswordPage.tsx`, `ForgotPasswordPage.tsx`, `index.ts`
- `src/modules/shuttle/pages/CustomerProfile.tsx`
- `src/modules/driver/pages/DriverProfile.tsx`
- 1 migration SQL

**EDIT**
- `src/App.tsx` — wrap dengan AuthProvider
- `src/shared/moduleRegistry.ts` — tambah authModule
- `src/modules/driver/index.ts`, `src/modules/driver/pages/DriverHome.tsx` — pakai RequireAuth + entry profile
- `src/modules/shuttle/index.ts`, `src/modules/shuttle/pages/ShuttleHome.tsx`, `MyBookings.tsx` — entry profile
- `src/modules/admin/pages/AdminLogin.tsx` — pakai shared authApi (tetap di /admin/login)

**DELETE**
- `src/modules/shuttle/pages/CustomerLogin.tsx` (route redirect ke /auth)
- `src/modules/driver/pages/DriverLogin.tsx` (route redirect ke /auth)

### 8. Tidak Termasuk

- Email verification custom branding (default Lovable email cukup)
- OAuth (Google/Apple) — bisa fitur lanjutan
- Admin page khusus verifikasi dokumen driver (struktur disiapkan, UI menyusul)
- 2FA / phone OTP

### Hasil

- **Satu pintu auth**: `/auth` untuk semua role (Customer, Driver). Admin tetap di `/admin/login` karena workflow grant role.
- **Profile lengkap**: Customer (basic + stats + recent bookings), Driver (basic + vehicle + dokumen SIM/STNK + earning stats).
- **Forgot password** lengkap dengan `/reset-password`.
- **Shared auth core** pakai context — semua komponen tinggal `useAuth()`. Routes protected pakai `<RequireAuth role="…">`.
- Code auth duplicate (3 halaman login) dihapus, jadi shared.

