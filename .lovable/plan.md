

## Plan: HeadBanner dengan Image Carousel (ala Traveloka)

### Konteks
HeadBanner saat ini hanya gradien biru polos dengan teks. User ingin tampilan kaya gambar seperti Traveloka — hero dengan **carousel/slider** banner promosi (gambar besar, indikator dot, autoplay) di belakang/menggantikan area gradient.

Embla Carousel sudah tersedia di `src/components/ui/carousel.tsx` (shadcn). Tinggal pasang plugin autoplay.

### Desain Banner Baru

**Mode "hero" (Home page) — full carousel banner**
```
┌─────────────────────────────────────────┐
│ [logo PYU-GO]              [bell/avatar]│ ← overlay header
│                                          │
│   ╔═════════════════════════════════╗   │
│   ║                                 ║   │
│   ║   [Gambar Promo 1 / 2 / 3]      ║   │ ← carousel
│   ║   Title overlay + subtitle      ║   │
│   ║                                 ║   │
│   ╚═════════════════════════════════╝   │
│              ● ○ ○                       │ ← dots indicator
└─────────────────────────────────────────┘
```
- Tinggi: `h-48 md:h-72` (mobile) / `h-80` (desktop)
- Gambar object-cover + dark gradient overlay bawah biar teks readable
- Autoplay 4 detik per slide, loop
- Dots di bawah carousel
- Wordmark PYU-GO + rightSlot tetap absolute di top kiri/kanan

**Mode "compact" (halaman dalam)** — TETAP gradien biru sederhana (tanpa carousel) karena cuma untuk subhalaman.

### Komponen yang Diubah/Dibuat

**1. NEW `src/shared/data/heroBanners.ts`**
Data slider default (3 banner). Pakai gambar travel/hotel/transport dari Unsplash:
```ts
export const DEFAULT_HERO_BANNERS = [
  { id: 1, image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200", title: "Diskon 50% Hotel", subtitle: "Booking sekarang sampai 30 April", cta: "Pesan sekarang", href: "/hotel" },
  { id: 2, image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200", title: "Cashback Shuttle 25K", subtitle: "Antar kota lebih hemat", cta: "Cari shuttle", href: "/shuttle" },
  { id: 3, image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200", title: "Ride Gratis Pertama", subtitle: "Khusus pengguna baru", cta: "Coba sekarang", href: "/ride" },
];
```

**2. UPDATE `src/shared/components/HeadBanner.tsx`**
Tambah props:
```ts
banners?: HeroBanner[];     // jika ada → render carousel
autoplayMs?: number;        // default 4500
```
- Jika `variant="hero"` dan `banners` ada → render `<Carousel>` dengan autoplay plugin + dots.
- Jika tidak → render layout lama (gradient + title text).
- Wordmark + rightSlot tetap di top, absolute overlay di atas carousel.
- Dark gradient overlay (`bg-gradient-to-t from-black/60`) di bawah gambar untuk readability text.

**3. INSTALL package** `embla-carousel-autoplay` (sudah biasa dipakai dengan embla).

**4. UPDATE `src/pages/Home.tsx`**
Pass `banners={DEFAULT_HERO_BANNERS}` ke `<HeadBanner>`. Hapus section "Promo Spesial" duplikat di bawah (atau biarkan sebagai grid kedua — keputusan: **hapus**, karena sudah jadi carousel).

### Detail Teknis Carousel

- Library: `embla-carousel-react` (sudah ada) + `embla-carousel-autoplay` plugin
- Setup:
  ```tsx
  import Autoplay from "embla-carousel-autoplay";
  const autoplay = useRef(Autoplay({ delay: 4500, stopOnInteraction: false }));
  <Carousel opts={{ loop: true }} plugins={[autoplay.current]}>
  ```
- Dots indicator: subscribe `api.on("select")` untuk track current index, render `n` dots.
- Tap banner → navigate ke `href` lewat `useNavigate()`.

### File yang Disentuh
- NEW `src/shared/data/heroBanners.ts`
- EDIT `src/shared/components/HeadBanner.tsx` (tambah carousel mode)
- EDIT `src/pages/Home.tsx` (pass banners, hapus promo grid duplikat)
- INSTALL `embla-carousel-autoplay` (via package.json)

### Tidak Termasuk
- Tidak buat admin UI untuk edit banner (sementara hardcoded di `heroBanners.ts`; bisa fitur lanjutan integrasi DB).
- Tidak ubah mode `compact` — tetap gradien polos.
- Tidak migrasi gambar ke storage Supabase — pakai URL Unsplash.

### Hasil
Home page punya hero carousel ala Traveloka: 3 gambar promo besar bergantian otomatis tiap 4.5 detik, dots indicator, tap → navigate ke modul terkait. Wordmark PYU-GO tetap floating di pojok kiri atas.

