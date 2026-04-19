

# Plan: Geocoding Pencarian Alamat (Nominatim OSM) di Editor Koordinat

## Konsep
Tambahkan search box di `PickupCoordinateMap.tsx` yang query Nominatim OSM (gratis, no API key) untuk cari alamat → tampilkan hasil dropdown → klik hasil = set lat/lng ke titik aktif (sama seperti klik peta) + pan map ke lokasi.

## API Nominatim
- Endpoint: `https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=5&countrycodes=id`
- Free, no key. Wajib User-Agent header (browser auto-set sudah cukup untuk usage rendah).
- Rate limit: 1 req/sec → debounce input 500ms.
- Response: `[{ display_name, lat, lon, ... }]`.

## UI di `PickupCoordinateMap.tsx`

Tambahkan **search bar di atas peta** (di samping banner capture mode):
- Input dengan placeholder "Cari alamat... (cth: Hermes Palace Medan)"
- Icon Search di kiri, tombol X clear di kanan saat ada query
- Loading spinner saat fetching
- Dropdown hasil (max 5) muncul di bawah input:
  - Tiap item: nama (bold) + display_name lengkap (kecil, muted) + koordinat
  - Klik → panggil `onCapture(activeCode, lat, lon)` jika ada `activeCode`, else hanya pan map ke lokasi + buka prompt "Pilih titik dulu di tabel untuk capture"
- Keyboard: Enter pilih hasil pertama, Esc tutup dropdown

## Behavior
- Debounce 500ms sebelum fetch
- Min 3 karakter sebelum query
- Bila tidak ada `activeCode`, hasil klik tetap pan map (preview) tapi toast info "Pilih baris dengan tombol crosshair dulu untuk capture koordinat"
- Append " Medan" otomatis bila query tidak mengandung kota? **TIDAK** — biarkan user kontrol penuh, mungkin admin cari di luar Medan
- Setelah capture sukses, clear search box

## State Baru
```tsx
const [query, setQuery] = useState("");
const [results, setResults] = useState<NominatimResult[]>([]);
const [loading, setLoading] = useState(false);
const [open, setOpen] = useState(false);
```

Effect dengan `setTimeout` 500ms untuk debounce fetch.

## File Changes

**EDIT:** `src/modules/shuttle/components/RayonRouteMap.tsx`? **TIDAK.** Editor admin pakai `PickupCoordinateMap.tsx`.

**EDIT:** `src/modules/admin/components/PickupCoordinateMap.tsx` — tambah search bar + Nominatim fetch + dropdown hasil + handler klik hasil.

Tidak perlu edit `AdminRayons.tsx` — handler `onCapture` sudah ada dan dipakai ulang.

## UX Flow
1. Admin edit Rayon A, klik crosshair J3 (Cambridge).
2. Banner: "Klik di peta untuk set koordinat J3 - Cambridge".
3. Admin ketik "Cambridge Hotel Medan" di search box.
4. Setelah 500ms muncul 3 hasil dari Nominatim.
5. Klik hasil pertama → lat/lng terisi di tabel J3, marker muncul di peta, auto-advance ke J4, search box clear.
6. Lanjut ketik nama hotel berikutnya untuk J4, dst.

## Hasil
Admin bisa isi 14 titik tanpa harus tau koordinat manual maupun klik di peta secara akurat — cukup ketik nama hotel/landmark. Workflow jauh lebih cepat untuk admin yang tidak familiar dengan map navigation.

