

## Plan: Atur Jarak Banner ↔ Module Cards

### Konteks
Di mobile (390px viewport, route `/`), section module cards (Hotel/Shuttle/Ride/dll) sekarang pakai class `-mt-4` yang menariknya **menumpuk** ke atas banner carousel. User merasa terlalu rapat / overlap.

Di `Home.tsx` line ~52:
```tsx
<section className={isMobile ? "px-3 -mt-4" : "container -mt-10"}>
```

Search bar mobile juga pakai `-mt-2` (line ~40) yang nempel ke banner.

### Solusi

**Beri jarak napas yang nyaman antara banner dan kartu modul**, tetap pertahankan efek "card mengambang di atas banner" (khas Traveloka) tapi tidak terlalu menumpuk.

Perubahan minimal di `src/pages/Home.tsx`:

**Mobile:**
- Search bar band: `-mt-2` → tetap (search memang nempel banner sebagai bagian hero)
- Module section: `px-3 -mt-4` → `px-3 mt-4` (turunkan ke bawah, tidak overlap)

**Desktop:**
- Module section: `container -mt-10` → `container -mt-6` (overlap lebih halus, tetap "floating card" tapi lebih banyak banner terlihat)

**Recommendations section** (line ~67):
- Mobile: `mt-6` → `mt-8` (sedikit lebih lega dari kartu modul)
- Desktop: tetap `mt-10`

### File yang Disentuh
- `src/pages/Home.tsx` — 2 baris className spacing.

### Hasil
Banner carousel terlihat penuh tanpa tertutup terlalu banyak oleh kartu modul. Kartu modul punya jarak napas dari banner di mobile (tidak overlap) dan overlap halus di desktop. Rekomendasi hotel di bawahnya juga punya breathing room yang cukup.

