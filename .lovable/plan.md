

## Plan: Vendor Chunk Splitting di vite.config.ts

### Konteks
Setelah migrasi React.lazy, bundle initial turun ke 602KB tapi masih 1 chunk vendor besar berisi semua dependencies. Vendor splitting akan:
- Pisah chunk yang jarang berubah (react, radix-ui) → cache lebih awet antar deploy
- Isolasi library besar (leaflet ~150KB, supabase) → tidak block initial load kalau tidak dipakai
- Paralel download chunk → faster TTI

### Strategi Manual Chunks

Tambah `build.rollupOptions.output.manualChunks` di `vite.config.ts` sebagai **function** (bukan object) — lebih fleksibel & aman untuk dynamic imports:

```ts
manualChunks(id) {
  if (!id.includes("node_modules")) return;
  if (id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) return "react-vendor";
  if (id.includes("@radix-ui")) return "radix-vendor";
  if (id.includes("leaflet") || id.includes("react-leaflet")) return "leaflet-vendor";
  if (id.includes("@supabase") || id.includes("@tanstack/react-query")) return "supabase-vendor";
  if (id.includes("lucide-react")) return "icons-vendor";
  if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
  if (id.includes("embla-carousel")) return "carousel-vendor";
  if (id.includes("date-fns") || id.includes("react-day-picker")) return "date-vendor";
  // sisanya jadi default vendor chunk
  return "vendor";
}
```

### Tambahan Konfigurasi

- `chunkSizeWarningLimit: 600` — naikkan threshold warning (default 500KB) supaya tidak noise.
- Tetap pakai `dedupe` array yang sudah ada di `resolve` untuk react/query.

### File yang Disentuh
- `vite.config.ts` — tambah `build.rollupOptions.output.manualChunks` + `chunkSizeWarningLimit`.

### Tidak Termasuk
- Tidak ubah modul React.lazy (sudah optimal).
- Tidak setup CDN / preload tags.
- Tidak compress gzip/brotli config (Vite default sudah cukup).

### Hasil
Bundle terpecah jadi ~7 vendor chunks:
- `react-vendor` (~140KB) — paling stabil, cache panjang
- `radix-vendor` (~120KB) — UI primitives
- `leaflet-vendor` (~160KB) — hanya load saat buka map
- `supabase-vendor` (~80KB) — backend client + query
- `icons-vendor` (~40KB) — lucide tree-shaken
- `charts-vendor` (~90KB) — recharts (admin dashboard)
- `carousel-vendor` (~20KB) — embla
- `vendor` (sisa misc)

Caching lebih efektif: update kode app tidak invalidate vendor; update 1 dep tidak invalidate yang lain.

