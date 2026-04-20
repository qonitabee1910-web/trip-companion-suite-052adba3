

## Plan: Copy/Apply Seat Layout antar Kendaraan & Service

### Konteks
Saat ini admin harus edit denah satu per satu untuk 9 kombinasi (3 kendaraan × 3 tier). Banyak kombinasi sebenarnya mirip — admin ingin pakai hasil editor pada kombinasi lain tanpa edit ulang.

### Fitur yang Ditambahkan

**1. Tombol "Salin ke..." di SeatEditorPanel**
- Letak: di header card editor, sebelah tombol Simpan/Reset.
- Klik → buka Dialog dengan:
  - Daftar 9 kombinasi (LayoutKey) sebagai checkbox grid (kombinasi yang sedang aktif otomatis disabled).
  - Toggle "Sertakan gambar denah" (default ON) — jika OFF hanya posisi kursi & driver yang disalin, gambar target tetap.
  - Tombol "Salin & Simpan ke X kombinasi terpilih".

**2. Logika Copy**
- Untuk tiap target terpilih: ambil current `config` editor → kalau toggle gambar OFF, replace `image` dengan gambar existing target (dari cache/preset) → panggil `saveLayoutToStorage(targetKey, mergedConfig, includeImage)`.
- Lakukan sequential `await` supaya error satu target tidak menggagalkan semua, tampilkan ringkasan toast: "Berhasil 3, gagal 1 (akses ditolak)".
- Otomatis trigger realtime → semua user lain dapat update.

**3. Guard Admin**
- Tombol "Salin ke..." disabled jika bukan admin (pakai state `isAdmin` yang sudah ada).

### File yang Disentuh
- **`src/modules/shuttle/components/SeatEditorPanel.tsx`** — tambah Dialog "Copy Layout", state target selection, handler `handleCopyToTargets`.
- **`src/modules/shuttle/data/seatLayouts.ts`** — tambah helper `copyLayoutToTargets(sourceKey, targetKeys[], includeImage): Promise<{ok: number, failed: {key, msg}[]}>` yang membungkus loop save.

### Tidak Termasuk
- Tidak ada UI untuk menambah kendaraan baru (vehicle types tetap dari tabel `vehicle_types` lewat admin Vehicles page) — hanya copy layout antar kombinasi yang sudah ada.
- Tidak migrasi gambar storage (gambar source dipakai ulang URL-nya, tidak duplikasi file).

### Hasil
Admin selesai edit HiAce Reguler → klik "Salin ke..." → centang HiAce Semi & HiAce Exec → Simpan. Dalam 1 klik, 2 kombinasi lain ikut update di DB & realtime broadcast ke semua device.

