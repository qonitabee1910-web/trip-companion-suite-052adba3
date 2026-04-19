export type RayonId = string;

export interface PickupPoint {
  code: string; // J1, J2…
  name: string;
  time: string; // "06:00"
  distanceToNext: number; // meters; 0 untuk titik terakhir
}

export interface Rayon {
  id: RayonId;
  name: string;
  area: string;
  pickupPoints: PickupPoint[];
  color: string;
  estimateMin: number;
  surcharge?: number;
  farePerKm?: number; // Rp per km, default 1500
  perPickupFare?: boolean; // hitung sisa jarak dari titik user
}

export interface Destination {
  code: string;
  name: string;
  short: string;
}

export interface ShuttleContent {
  heroTitle: string;
  heroSubtitle: string;
  footerNote: string;
  paxMax: number;
}

export const DEFAULT_FARE_PER_KM = 1500;

// Seed dari foto PYU-GO
export const SEED_RAYONS_PYUGO: Rayon[] = [
  {
    id: "A",
    name: "Rayon A",
    area: "Medan Pusat",
    color: "primary",
    estimateMin: 134,
    surcharge: 0,
    farePerKm: DEFAULT_FARE_PER_KM,
    pickupPoints: [
      { code: "J1", name: "Hermes Palace", time: "06:00", distanceToNext: 700 },
      { code: "J2", name: "Kama Hotel", time: "06:05", distanceToNext: 950 },
      { code: "J3", name: "Travel Suite", time: "06:10", distanceToNext: 190 },
      { code: "J4", name: "RS Columbia Asia", time: "06:12", distanceToNext: 110 },
      { code: "J5", name: "Selecta", time: "06:14", distanceToNext: 400 },
      { code: "J6", name: "Danau Toba", time: "06:19", distanceToNext: 950 },
      { code: "J7", name: "LePolonia", time: "06:23", distanceToNext: 2000 },
      { code: "J8", name: "Istana Maimun", time: "06:31", distanceToNext: 450 },
      { code: "J9", name: "Mesjid Raya", time: "06:34", distanceToNext: 4100 },
      { code: "J10", name: "Grand Antarez", time: "06:46", distanceToNext: 2100 },
      { code: "J11", name: "Antares", time: "06:53", distanceToNext: 7100 },
      { code: "J12", name: "Simp. Marendal Aroma", time: "07:16", distanceToNext: 3400 },
      { code: "J13", name: "RM Khas Mandailing", time: "07:26", distanceToNext: 4800 },
      { code: "J14", name: "Simp. Amplas", time: "07:39", distanceToNext: 31000 },
      { code: "DEST", name: "KNO", time: "08:14", distanceToNext: 0 },
    ],
  },
  {
    id: "B",
    name: "Rayon B",
    area: "Medan Barat",
    color: "accent",
    estimateMin: 145,
    surcharge: 0,
    farePerKm: DEFAULT_FARE_PER_KM,
    pickupPoints: [
      { code: "J1", name: "Cambridge", time: "06:00", distanceToNext: 1400 },
      { code: "J2", name: "Swiss Bellin Gajah", time: "06:05", distanceToNext: 750 },
      { code: "J3", name: "Grand Darussalam", time: "06:08", distanceToNext: 160 },
      { code: "J4", name: "Sulthan Hotel", time: "06:10", distanceToNext: 160 },
      { code: "J5", name: "Grand Kanaya", time: "06:12", distanceToNext: 450 },
      { code: "J6", name: "Four Point", time: "06:15", distanceToNext: 3600 },
      { code: "J7", name: "Manhattan", time: "06:25", distanceToNext: 750 },
      { code: "J8", name: "Saka Hotel", time: "06:29", distanceToNext: 950 },
      { code: "J9", name: "Grand Jamee", time: "06:33", distanceToNext: 5200 },
      { code: "J10", name: "Sky View Apart", time: "06:47", distanceToNext: 3700 },
      { code: "J11", name: "The K-Hotel", time: "06:58", distanceToNext: 2000 },
      { code: "J12", name: "Simpang Pos", time: "07:04", distanceToNext: 2800 },
      { code: "J13", name: "Asrama Haji Medan", time: "07:11", distanceToNext: 1600 },
      { code: "J14", name: "RS Mitra Sejati", time: "07:16", distanceToNext: 4400 },
      { code: "J15", name: "Simpang Marendal", time: "07:28", distanceToNext: 3600 },
      { code: "J16", name: "Depan Bus ALS", time: "07:39", distanceToNext: 2800 },
      { code: "J17", name: "RS Mitra Medika Amp", time: "07:48", distanceToNext: 1200 },
      { code: "J18", name: "Tol/Simpang Amplas", time: "07:52", distanceToNext: 30000 },
      { code: "DEST", name: "KNO", time: "08:25", distanceToNext: 0 },
    ],
  },
  {
    id: "C",
    name: "Rayon C",
    area: "Medan Timur",
    color: "success",
    estimateMin: 90,
    surcharge: 0,
    farePerKm: DEFAULT_FARE_PER_KM,
    pickupPoints: [
      { code: "J1", name: "Adi Mulia", time: "06:00", distanceToNext: 450 },
      { code: "J2", name: "Santika", time: "06:03", distanceToNext: 240 },
      { code: "J3", name: "Arya Duta", time: "06:05", distanceToNext: 230 },
      { code: "J4", name: "Aston Grand City Hall", time: "06:08", distanceToNext: 130 },
      { code: "J5", name: "Grand Inna", time: "06:10", distanceToNext: 450 },
      { code: "J6", name: "Reiz Suite Artotel", time: "06:13", distanceToNext: 700 },
      { code: "J7", name: "Podomoro", time: "06:18", distanceToNext: 750 },
      { code: "J8", name: "JW Marriot", time: "06:23", distanceToNext: 750 },
      { code: "J9", name: "Emerald Garden", time: "06:28", distanceToNext: 1600 },
      { code: "J10", name: "Grand Mercure", time: "06:38", distanceToNext: 4800 },
      { code: "J11", name: "RS Columbia Asia Aksara", time: "06:50", distanceToNext: 1300 },
      { code: "J12", name: "Tol Bandar Selamat", time: "06:55", distanceToNext: 20000 },
      { code: "DEST", name: "Tol KNO", time: "07:30", distanceToNext: 0 },
    ],
  },
  {
    id: "D",
    name: "Rayon D",
    area: "Medan Polonia",
    color: "warning",
    estimateMin: 152,
    surcharge: 0,
    farePerKm: DEFAULT_FARE_PER_KM,
    pickupPoints: [
      { code: "J1", name: "Hotel TD Pardede", time: "06:00", distanceToNext: 2400 },
      { code: "J2", name: "Hermes Palace", time: "06:10", distanceToNext: 3500 },
      { code: "J3", name: "Ibis Styles", time: "06:21", distanceToNext: 850 },
      { code: "J4", name: "Fave Hotel", time: "06:24", distanceToNext: 1300 },
      { code: "J5", name: "Masjid Al Jihad", time: "06:29", distanceToNext: 550 },
      { code: "J6", name: "Hotel Deli", time: "06:31", distanceToNext: 350 },
      { code: "J7", name: "Grand Central", time: "06:33", distanceToNext: 1600 },
      { code: "J8", name: "Grand Impression Hotel", time: "06:38", distanceToNext: 550 },
      { code: "J9", name: "RAZ Hotel", time: "06:40", distanceToNext: 1600 },
      { code: "J10", name: "Rumah Sakit USU", time: "06:45", distanceToNext: 2000 },
      { code: "J11", name: "Grand Dhika Hotel", time: "07:01", distanceToNext: 2400 },
      { code: "J12", name: "Sky View Apart", time: "07:09", distanceToNext: 1800 },
      { code: "J13", name: "Simpang Harmonika", time: "07:15", distanceToNext: 3700 },
      { code: "J14", name: "Citra Garden", time: "07:23", distanceToNext: 2700 },
      { code: "J15", name: "Simpang POS", time: "07:32", distanceToNext: 2800 },
      { code: "J16", name: "Asrama Haji", time: "07:39", distanceToNext: 5900 },
      { code: "J17", name: "Simpang Amplas", time: "07:55", distanceToNext: 30000 },
      { code: "DEST", name: "Kualanamu", time: "08:32", distanceToNext: 0 },
    ],
  },
];

export const RAYONS: Rayon[] = SEED_RAYONS_PYUGO;

export const DEPART_TIMES = ["04:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

export const DEFAULT_DESTINATION: Destination = {
  code: "KNO",
  name: "Kualanamu International Airport",
  short: "KNO Airport",
};

export const DEFAULT_CONTENT: ShuttleContent = {
  heroTitle: "Shuttle ke KNO",
  heroSubtitle: "Pilih rayon keberangkatanmu",
  footerNote:
    "Cara pesan: pilih rayon → tentukan titik jemput & jam → pilih kelas service → pilih kendaraan → pilih kursi.",
  paxMax: 12,
};

export const DESTINATION: Destination = DEFAULT_DESTINATION;

// ---------- Migration helper (string[] → PickupPoint[]) ----------
type LegacyRayon = Omit<Rayon, "pickupPoints"> & {
  pickupPoints: (string | PickupPoint)[];
};

export function migrateRayon(r: LegacyRayon | Rayon): Rayon {
  const points = (r.pickupPoints || []).map((p, i): PickupPoint => {
    if (typeof p === "string") {
      return { code: `J${i + 1}`, name: p, time: "", distanceToNext: 0 };
    }
    return {
      code: p.code || `J${i + 1}`,
      name: p.name,
      time: p.time || "",
      distanceToNext: Number(p.distanceToNext) || 0,
    };
  });
  return {
    ...r,
    pickupPoints: points,
    farePerKm: r.farePerKm ?? DEFAULT_FARE_PER_KM,
    surcharge: r.surcharge ?? 0,
    perPickupFare: r.perPickupFare ?? false,
  } as Rayon;
}

// ---------- Helpers ----------
export function getTotalDistanceM(rayon: Rayon): number {
  return (rayon.pickupPoints || []).reduce((sum, p) => sum + (p.distanceToNext || 0), 0);
}

/** Returns remaining distance from given pickup code to destination (meters). */
export function getRemainingDistanceM(rayon: Rayon, fromCode: string): number {
  const pts = rayon.pickupPoints || [];
  const idx = pts.findIndex((p) => p.code === fromCode || p.name === fromCode);
  if (idx < 0) return getTotalDistanceM(rayon);
  return pts.slice(idx).reduce((sum, p) => sum + (p.distanceToNext || 0), 0);
}

export function getPickupNames(rayon: Rayon): string[] {
  return (rayon.pickupPoints || [])
    .filter((p) => p.code !== "DEST")
    .map((p) => p.name);
}

export function getRayon(id: string): Rayon | undefined {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("shuttle-admin:rayons");
      if (raw) {
        const list = (JSON.parse(raw) as LegacyRayon[]).map(migrateRayon);
        return list.find((r) => r.id.toUpperCase() === id.toUpperCase());
      }
    } catch {
      /* fallthrough */
    }
  }
  return RAYONS.find((r) => r.id.toUpperCase() === id.toUpperCase());
}

export function getDestination(): Destination {
  if (typeof window === "undefined") return DEFAULT_DESTINATION;
  try {
    const raw = localStorage.getItem("shuttle-admin:destination");
    return raw ? { ...DEFAULT_DESTINATION, ...(JSON.parse(raw) as Partial<Destination>) } : DEFAULT_DESTINATION;
  } catch {
    return DEFAULT_DESTINATION;
  }
}

export function getContent(): ShuttleContent {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = localStorage.getItem("shuttle-admin:content");
    return raw ? { ...DEFAULT_CONTENT, ...(JSON.parse(raw) as Partial<ShuttleContent>) } : DEFAULT_CONTENT;
  } catch {
    return DEFAULT_CONTENT;
  }
}
