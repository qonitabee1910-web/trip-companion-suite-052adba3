export interface HeroBanner {
  id: number | string;
  image: string;
  title: string;
  subtitle?: string;
  cta?: string;
  href?: string;
  badge?: string;
}

export const DEFAULT_HERO_BANNERS: HeroBanner[] = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80",
    title: "Diskon 50% Hotel",
    subtitle: "Booking sekarang sampai 30 April",
    cta: "Pesan sekarang",
    href: "/hotel",
    badge: "HOT DEAL",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80",
    title: "Cashback Shuttle 25K",
    subtitle: "Antar kota lebih hemat dengan PYU-GO",
    cta: "Cari shuttle",
    href: "/shuttle",
    badge: "PROMO",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=80",
    title: "Ride Gratis Pertama",
    subtitle: "Khusus pengguna baru — pesan instan",
    cta: "Coba sekarang",
    href: "/ride",
    badge: "BARU",
  },
];
