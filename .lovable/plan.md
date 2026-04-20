

## Plan: Rebrand → **PYU-GO** + Head Banner Baru

### Konteks Singkat
Brand "Traverla" tersebar di 5 file (`index.html`, `WebHeader.tsx`, `Home.tsx`, `RideHome.tsx`, `ResponsiveLayout.tsx`). Warna primer existing sudah biru (#0194F3 — Traveloka blue), tapi user ingin **biru langit** yang lebih cerah & airy. Tidak ada komponen "Head Banner" reusable saat ini — hero hanya inline di tiap halaman.

### Identitas Brand Baru: PYU-GO

**Wordmark**: `PYU-GO` (uppercase tegas, font-extrabold, letter-spacing tight)
**Tagline**: "Jalan-jalan, semua dari satu aplikasi."
**Logo mark**: ikon `Plane` (atau kombinasi `MapPin`) di atas chip putih bulat — konsisten dengan pola lama tapi diganti glyph.

**Palet Biru Langit (HSL)**
| Token | HSL | Hex approx | Pakai untuk |
|---|---|---|---|
| `--primary` | `202 89% 60%` | #38BDF8 | CTA, link, brand |
| `--primary-hover` | `202 89% 52%` | #0EA5E9 | hover |
| `--primary-soft` | `202 100% 95%` | #E0F2FE | bg lembut, badge |
| `--ring` | `202 89% 60%` | — | focus ring |
| `--gradient-hero` | linear `from 199 95% 74% → 202 89% 50%` | sky-300 → sky-500 | header, banner |
| `--accent` (tetap orange) | `16 100% 56%` | — | promo/CTA sekunder |

Modul color `--hotel` ikut update ke biru langit baru. `--shuttle` (hijau) & `--ride` (orange) tetap untuk diferensiasi.

### Komponen Baru: `<HeadBanner>`

**Lokasi**: `src/shared/components/HeadBanner.tsx`
**Props**:
```ts
{
  title: string;
  subtitle?: string;
  icon?: LucideIcon;          // default Plane
  variant?: "hero" | "compact"; // hero = besar (Home), compact = halaman dalam
  rightSlot?: ReactNode;       // optional (search, bell, avatar)
  showWordmark?: boolean;      // tampilkan "PYU-GO" di kiri
  className?: string;
}
```

**Render**:
- Background `bg-gradient-hero` (gradien biru langit baru) + tekstur subtle (radial-glow putih 10% di kanan atas via inline gradient).
- Wordmark `PYU-GO` di kiri dengan logo chip.
- Title `text-2xl md:text-4xl font-extrabold` + subtitle putih 85%.
- Mode `compact` = tinggi lebih kecil, tanpa subtitle besar — cocok untuk halaman modul.

### Perubahan File

**1. `src/index.css`** — ganti token `--primary*`, `--ring`, `--hotel*`, `--gradient-hero` ke palet biru langit baru. Update juga `.dark` mode.

**2. `index.html`** — title, description, author, og/twitter ke "PYU-GO — Jalan-jalan, semua dari satu aplikasi." Hapus og:image lama (atau biarkan sampai user upload baru).

**3. `src/shared/components/HeadBanner.tsx`** — komponen baru.

**4. `src/shared/components/WebHeader.tsx`** — wordmark `PYU-GO` (uppercase, tracking-tight), logo chip pakai `Plane`.

**5. `src/shared/components/ResponsiveLayout.tsx`** — default `mobileTitle="PYU-GO"`.

**6. `src/pages/Home.tsx`** — ganti hero mobile + web jadi pakai `<HeadBanner variant="hero">`. Wordmark "PYU-GO". Headline: "Hai, mau ke mana hari ini?" (mobile) / "Jalan-jalan, antar-jemput, sampai pesan kendaraan — semua dari PYU-GO." (web).

**7. `src/modules/ride/pages/RideHome.tsx`** — line 348: "Terima kasih sudah memesan dengan **PYU-GO**".

**8. `README.md`** (opsional) — update judul proyek ke PYU-GO.

### Tidak Termasuk
- Tidak buat logo SVG kustom — pakai Lucide `Plane` icon (user bisa upload logo nanti via Visual Edits / chat).
- Tidak ubah favicon (perlu file dari user).
- Tidak ubah skema warna `--shuttle` (hijau) dan `--ride` (orange) — tetap untuk diferensiasi modul.
- Tidak rename folder/route (`/shuttle`, `/ride`, `/hotel` tetap).

### Hasil
- Seluruh kemunculan "Traverla" → "PYU-GO" di UI & metadata.
- Warna brand bergeser dari Traveloka-blue ke **biru langit cerah** (#38BDF8 sky-400) dengan gradien hero sky-300 → sky-500 yang lebih ringan & modern.
- `<HeadBanner>` reusable bisa dipakai konsisten di Home, Hotel, Shuttle, Ride, Driver, Admin → tampilan lebih seragam dan brand-forward.

