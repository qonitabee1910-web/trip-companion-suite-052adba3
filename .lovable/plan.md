

# Analisis Inkonsistensi Seat Editor vs Tampilan User

## Akar Masalah

Saya cek, ada **3 bug yang berlapis** menyebabkan inkonsistensi:

### Bug 1 (utama): Save layout gagal karena RLS, tapi user di-toast "berhasil" 🚨
Console log menunjukkan error berulang:
```
[seatLayouts] persist failed: { code: "42501",
  message: "new row violates row-level security policy for table seat_layouts" }
```
Dan query DB membuktikan: tabel `seat_layouts` **kosong total** (0 row), padahal admin sudah klik Simpan beberapa kali.

**Penyebab**: RLS `seat_layouts` mengharuskan `has_role(auth.uid(), 'admin')` untuk INSERT. Saat admin pakai Seat Editor **tanpa login** (atau login tapi tidak punya role admin di tabel `user_roles`), insert ditolak DB.

**Tapi UI menipu**: di `saveLayoutToStorage` (file `seatLayouts.ts` baris 242-266), kode optimistik:
1. Update cache lokal duluan → editor seolah "tersimpan" + badge "☁ Tersimpan di cloud" muncul
2. Lalu `void persistSeatLayout(...)` fire-and-forget → error RLS hanya masuk console, **tidak** dipropagasi ke UI
3. Toast `"disimpan"` tetap muncul

Akibat: **admin lihat hasil baru** (karena cache RAM-nya sendiri), **user di device lain lihat preset default** (karena DB kosong → cache mereka pakai `LAYOUT_PRESETS`). Setelah refresh, admin pun balik ke default karena cache di-rehydrate dari DB kosong.

### Bug 2: Cache lokal yang "berhasil" tetap dipakai → ilusi sukses
Walau persist gagal, cache RAM tetap di-set di line 257:
```ts
cloudCache.seatLayouts = { ...cloudCache.seatLayouts, [layoutKey]: payload };
```
Membuat editor sendiri konsisten saat masih open, tapi tidak shareable.

### Bug 3: User lain menunggu realtime yang tidak pernah terkirim
`SeatMap` user membaca dari `cloudCache.seatLayouts`. Kalau insert ke DB gagal → realtime `seat_layouts` tidak fire → user lain tidak pernah lihat update.

## Solusi

### A. Surface error save ke admin (no more silent failure)
- Refactor `saveLayoutToStorage` jadi **async** dengan return `Promise<boolean>`. Tunggu `persistSeatLayout` selesai sebelum klaim sukses.
- Di `SeatEditorPanel.saveLayout`: `await` dan tampilkan toast **error spesifik** (`"Tidak punya izin admin"` jika 42501, `"Gagal koneksi"` lain).
- Saat error → **rollback** cache lokal supaya tidak ada inkonsistensi RAM vs DB.
- Set state `saving` + disable tombol selama proses.

### B. Tambah role-check guard di Editor
- Saat mount `SeatEditorPanel`, panggil `supabase.auth.getUser()` + cek `has_role` → tampilkan banner kuning **"Login admin diperlukan untuk menyimpan ke cloud"** kalau bukan admin. Tombol Simpan jadi disabled.

### C. Pastikan ada minimal 1 admin user (root cause data)
Saya cek `user_roles` table — kemungkinan besar belum ada user dengan role `admin`. Akan cek query ini saat eksekusi dan, jika perlu, instruksikan admin untuk:
1. Sign up via halaman auth (bila ada) atau buat user.
2. Tambah row `user_roles` (admin perlu lewat panel Lovable Cloud / migration manual karena RLS `user_roles` cuma admin yg bisa manage — chicken-and-egg).
- Solusi: tambahkan **migration seed** untuk grant role `admin` ke user dengan email tertentu. Akan tanyakan email admin saat eksekusi.

### D. Verifikasi sync untuk gambar upload
Bucket `seat-layout-images` juga punya RLS admin-only INSERT. Sama logikanya — kalau bukan admin, upload gagal. Sudah ditangani di `handleImageUpload` dengan toast error, jadi cukup pastikan flow A+B+C jalan.

## File yang Disentuh

- **`src/modules/shuttle/data/seatLayouts.ts`** — `saveLayoutToStorage` jadi async + rollback on error.
- **`src/modules/shuttle/components/SeatEditorPanel.tsx`** — `await save`, state `saving`, banner role-check.
- **Migration baru** — fungsi RPC `grant_admin_by_email(email text)` SECURITY DEFINER, atau direct seed admin role kalau user sudah confirm email.
- **Pertanyaan ke user**: email admin yang akan di-grant role.

## Hasil

- Klik Simpan tanpa admin role → toast merah jelas: "Akses ditolak, login admin diperlukan", tidak ada false positive.
- Klik Simpan dengan admin role → DB benar terisi → realtime broadcast → user di device lain dapat layout baru dalam <1 detik tanpa refresh.
- Editor & user view **konsisten 100%** karena keduanya baca dari source-of-truth DB yang sama.

