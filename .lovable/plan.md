

## Plan: Fix Jam Berangkat Global tidak Persist saat Refresh

### Akar Masalah (sama pola dengan bug seat_layouts sebelumnya)

DB sudah punya 7 rows `depart_times` dan infrastruktur sudah lengkap (`persistDepartTimes`, hydrate, realtime). **Tapi `saveDepartTimes` di `repository.ts` masih fire-and-forget**:

```ts
// src/modules/shuttle/data/repository.ts (line 45-49)
export function saveDepartTimes(times: string[]) {
  const sorted = [...new Set(times)].sort();
  cloudCache.departTimes = sorted;        // ← cache lokal langsung berubah
  void persistDepartTimes(sorted);         // ← fire-and-forget, error RLS hanya ke console
}
```

Akibat: kalau user bukan admin (atau session expired), RLS reject INSERT/DELETE → DB tetap data lama → cache lokal "seolah" tersimpan → **refresh = hydrate dari DB → balik ke data DB yang tidak terupdate**. Admin mengira "berubah ke awal".

Bonus issue: `persistDepartTimes` sendiri pakai strategi **DELETE all + INSERT all**. Kalau DELETE berhasil tapi INSERT gagal (atau sebaliknya parsial), DB bisa tertinggal kosong/inkonsistens.

### Solusi

**1. `cloudStore.persistDepartTimes` → upsert-only + return ok/error**
- Ganti DELETE-all + INSERT-all jadi: upsert by composite (sort_order) + delete only times yang tidak ada di list baru. Lebih atomic.
- Return `{ ok: boolean, error?: { code, message } }` mirip pola `saveLayoutToStorage`.

**2. `repository.saveDepartTimes` → async + rollback + UI feedback**
```ts
export async function saveDepartTimes(times: string[]): Promise<SaveResult> {
  const previous = cloudCache.departTimes;
  const sorted = [...new Set(times)].sort();
  cloudCache.departTimes = sorted;
  notify();
  const res = await persistDepartTimes(sorted);
  if (!res.ok) {
    cloudCache.departTimes = previous;     // rollback
    notify();
  }
  return res;
}
```

**3. `AdminRayons.persistTimes` → await + toast spesifik + role guard**
- Ubah `persistTimes` jadi async, `await saveDepartTimes(...)`.
- Jika `error.code === "42501"` → toast merah: "Akses ditolak — login admin diperlukan untuk simpan jam berangkat".
- Jika error lain → toast: "Gagal menyimpan: {message}".
- Jika sukses → toast hijau "Jam berangkat tersimpan ke cloud".
- Tambah cek admin role saat mount (pakai pola yang sama dengan SeatEditorPanel) → kalau bukan admin, disable input "Tambah jam" + tombol hapus + tampilkan banner kuning "Login admin di /admin/login untuk mengubah jam berangkat".

**4. Verifikasi realtime sudah menyala**
Sudah ada di `setupRealtime` line 441 — tinggal pastikan `depart_times` ada di publication `supabase_realtime`. Kalau belum, tambah migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.depart_times;
ALTER TABLE public.depart_times REPLICA IDENTITY FULL;
```
(akan dicek dulu, kalau sudah ada skip migration ini)

### File yang Disentuh
- `src/modules/shuttle/data/cloudStore.ts` — `persistDepartTimes` jadi async return `{ok,error}`, strategi upsert+delete-missing.
- `src/modules/shuttle/data/repository.ts` — `saveDepartTimes` jadi async + rollback.
- `src/modules/admin/pages/AdminRayons.tsx` — `persistTimes` await, toast spesifik, role guard banner, disable input non-admin.
- (Conditional) Migration baru jika `depart_times` belum di publication realtime.

### Hasil
- Admin tambah jam "10:30" → tersimpan ke DB → refresh tetap ada → device lain dapat realtime <1 detik.
- Non-admin coba edit → toast merah jelas, cache rollback, tidak ada false success.
- Editor & customer view 100% konsisten karena keduanya baca dari DB yang sama.

