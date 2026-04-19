export type RayonId = string;

export interface PickupPoint {
  code: string; // J1, J2…
  name: string;
  time: string; // "06:00"
  distanceToNext: number; // meters; 0 untuk titik terakhir
  lat?: number;
  lng?: number;
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

// Seed dari foto PYU-GO (koordinat approx Medan landmarks ±200m)
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
      { code: "J1", name: "Hermes Palace", time: "06:00", distanceToNext: 700, lat: 3.5752, lng: 98.6722 },
      { code: "J2", name: "Kama Hotel", time: "06:05", distanceToNext: 950, lat: 3.5790, lng: 98.6760 },
      { code: "J3", name: "Travel Suite", time: "06:10", distanceToNext: 190, lat: 3.5840, lng: 98.6820 },
      { code: "J4", name: "RS Columbia Asia", time: "06:12", distanceToNext: 110, lat: 3.5852, lng: 98.6830 },
      { code: "J5", name: "Selecta", time: "06:14", distanceToNext: 400, lat: 3.5860, lng: 98.6838 },
      { code: "J6", name: "Danau Toba", time: "06:19", distanceToNext: 950, lat: 3.5885, lng: 98.6865 },
      { code: "J7", name: "LePolonia", time: "06:23", distanceToNext: 2000, lat: 3.5810, lng: 98.6830 },
      { code: "J8", name: "Istana Maimun", time: "06:31", distanceToNext: 450, lat: 3.5752, lng: 98.6837 },
      { code: "J9", name: "Mesjid Raya", time: "06:34", distanceToNext: 4100, lat: 3.5755, lng: 98.6878 },
      { code: "J10", name: "Grand Antarez", time: "06:46", distanceToNext: 2100, lat: 3.5520, lng: 98.7000 },
      { code: "J11", name: "Antares", time: "06:53", distanceToNext: 7100, lat: 3.5400, lng: 98.7100 },
      { code: "J12", name: "Simp. Marendal Aroma", time: "07:16", distanceToNext: 3400, lat: 3.5050, lng: 98.7150 },
      { code: "J13", name: "RM Khas Mandailing", time: "07:26", distanceToNext: 4800, lat: 3.4850, lng: 98.7250 },
      { code: "J14", name: "Simp. Amplas", time: "07:39", distanceToNext: 31000, lat: 3.4650, lng: 98.7400 },
      { code: "DEST", name: "KNO", time: "08:14", distanceToNext: 0, lat: 3.6422, lng: 98.8853 },
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
      { code: "J1", name: "Cambridge", time: "06:00", distanceToNext: 1400, lat: 3.5912, lng: 98.6770 },
      { code: "J2", name: "Swiss Bellin Gajah", time: "06:05", distanceToNext: 750, lat: 3.5980, lng: 98.6720 },
      { code: "J3", name: "Grand Darussalam", time: "06:08", distanceToNext: 160, lat: 3.6010, lng: 98.6700 },
      { code: "J4", name: "Sulthan Hotel", time: "06:10", distanceToNext: 160, lat: 3.6015, lng: 98.6695 },
      { code: "J5", name: "Grand Kanaya", time: "06:12", distanceToNext: 450, lat: 3.6025, lng: 98.6685 },
      { code: "J6", name: "Four Point", time: "06:15", distanceToNext: 3600, lat: 3.6050, lng: 98.6650 },
      { code: "J7", name: "Manhattan", time: "06:25", distanceToNext: 750, lat: 3.5870, lng: 98.6680 },
      { code: "J8", name: "Saka Hotel", time: "06:29", distanceToNext: 950, lat: 3.5830, lng: 98.6660 },
      { code: "J9", name: "Grand Jamee", time: "06:33", distanceToNext: 5200, lat: 3.5780, lng: 98.6630 },
      { code: "J10", name: "Sky View Apart", time: "06:47", distanceToNext: 3700, lat: 3.5500, lng: 98.6700 },
      { code: "J11", name: "The K-Hotel", time: "06:58", distanceToNext: 2000, lat: 3.5300, lng: 98.6800 },
      { code: "J12", name: "Simpang Pos", time: "07:04", distanceToNext: 2800, lat: 3.5200, lng: 98.6850 },
      { code: "J13", name: "Asrama Haji Medan", time: "07:11", distanceToNext: 1600, lat: 3.5050, lng: 98.6900 },
      { code: "J14", name: "RS Mitra Sejati", time: "07:16", distanceToNext: 4400, lat: 3.4980, lng: 98.6950 },
      { code: "J15", name: "Simpang Marendal", time: "07:28", distanceToNext: 3600, lat: 3.4850, lng: 98.7100 },
      { code: "J16", name: "Depan Bus ALS", time: "07:39", distanceToNext: 2800, lat: 3.4750, lng: 98.7200 },
      { code: "J17", name: "RS Mitra Medika Amp", time: "07:48", distanceToNext: 1200, lat: 3.4680, lng: 98.7300 },
      { code: "J18", name: "Tol/Simpang Amplas", time: "07:52", distanceToNext: 30000, lat: 3.4650, lng: 98.7400 },
      { code: "DEST", name: "KNO", time: "08:25", distanceToNext: 0, lat: 3.6422, lng: 98.8853 },
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
      { code: "J1", name: "Adi Mulia", time: "06:00", distanceToNext: 450, lat: 3.5840, lng: 98.6750 },
      { code: "J2", name: "Santika", time: "06:03", distanceToNext: 240, lat: 3.5860, lng: 98.6770 },
      { code: "J3", name: "Arya Duta", time: "06:05", distanceToNext: 230, lat: 3.5875, lng: 98.6785 },
      { code: "J4", name: "Aston Grand City Hall", time: "06:08", distanceToNext: 130, lat: 3.5890, lng: 98.6800 },
      { code: "J5", name: "Grand Inna", time: "06:10", distanceToNext: 450, lat: 3.5895, lng: 98.6810 },
      { code: "J6", name: "Reiz Suite Artotel", time: "06:13", distanceToNext: 700, lat: 3.5910, lng: 98.6840 },
      { code: "J7", name: "Podomoro", time: "06:18", distanceToNext: 750, lat: 3.5950, lng: 98.6890 },
      { code: "J8", name: "JW Marriot", time: "06:23", distanceToNext: 750, lat: 3.5870, lng: 98.6880 },
      { code: "J9", name: "Emerald Garden", time: "06:28", distanceToNext: 1600, lat: 3.5820, lng: 98.6870 },
      { code: "J10", name: "Grand Mercure", time: "06:38", distanceToNext: 4800, lat: 3.5750, lng: 98.6950 },
      { code: "J11", name: "RS Columbia Asia Aksara", time: "06:50", distanceToNext: 1300, lat: 3.5680, lng: 98.7100 },
      { code: "J12", name: "Tol Bandar Selamat", time: "06:55", distanceToNext: 20000, lat: 3.5550, lng: 98.7250 },
      { code: "DEST", name: "Tol KNO", time: "07:30", distanceToNext: 0, lat: 3.6422, lng: 98.8853 },
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
      { code: "J1", name: "Hotel TD Pardede", time: "06:00", distanceToNext: 2400, lat: 3.5780, lng: 98.6680 },
      { code: "J2", name: "Hermes Palace", time: "06:10", distanceToNext: 3500, lat: 3.5752, lng: 98.6722 },
      { code: "J3", name: "Ibis Styles", time: "06:21", distanceToNext: 850, lat: 3.5830, lng: 98.6790 },
      { code: "J4", name: "Fave Hotel", time: "06:24", distanceToNext: 1300, lat: 3.5850, lng: 98.6810 },
      { code: "J5", name: "Masjid Al Jihad", time: "06:29", distanceToNext: 550, lat: 3.5870, lng: 98.6830 },
      { code: "J6", name: "Hotel Deli", time: "06:31", distanceToNext: 350, lat: 3.5880, lng: 98.6840 },
      { code: "J7", name: "Grand Central", time: "06:33", distanceToNext: 1600, lat: 3.5890, lng: 98.6850 },
      { code: "J8", name: "Grand Impression Hotel", time: "06:38", distanceToNext: 550, lat: 3.5820, lng: 98.6870 },
      { code: "J9", name: "RAZ Hotel", time: "06:40", distanceToNext: 1600, lat: 3.5800, lng: 98.6880 },
      { code: "J10", name: "Rumah Sakit USU", time: "06:45", distanceToNext: 2000, lat: 3.5650, lng: 98.6580 },
      { code: "J11", name: "Grand Dhika Hotel", time: "07:01", distanceToNext: 2400, lat: 3.5500, lng: 98.6700 },
      { code: "J12", name: "Sky View Apart", time: "07:09", distanceToNext: 1800, lat: 3.5400, lng: 98.6750 },
      { code: "J13", name: "Simpang Harmonika", time: "07:15", distanceToNext: 3700, lat: 3.5300, lng: 98.6820 },
      { code: "J14", name: "Citra Garden", time: "07:23", distanceToNext: 2700, lat: 3.5150, lng: 98.6900 },
      { code: "J15", name: "Simpang POS", time: "07:32", distanceToNext: 2800, lat: 3.5200, lng: 98.6850 },
      { code: "J16", name: "Asrama Haji", time: "07:39", distanceToNext: 5900, lat: 3.5050, lng: 98.6900 },
      { code: "J17", name: "Simpang Amplas", time: "07:55", distanceToNext: 30000, lat: 3.4650, lng: 98.7400 },
      { code: "DEST", name: "Kualanamu", time: "08:32", distanceToNext: 0, lat: 3.6422, lng: 98.8853 },
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
      lat: typeof p.lat === "number" ? p.lat : undefined,
      lng: typeof p.lng === "number" ? p.lng : undefined,
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
        const found = list.find((r) => r.id.toUpperCase() === id.toUpperCase());
        if (found) {
          // Merge coordinates from seed if admin override is missing them
          const seed = RAYONS.find((r) => r.id.toUpperCase() === id.toUpperCase());
          if (seed) {
            found.pickupPoints = found.pickupPoints.map((p) => {
              if (p.lat != null && p.lng != null) return p;
              const sp = seed.pickupPoints.find((s) => s.code === p.code || s.name === p.name);
              return sp ? { ...p, lat: p.lat ?? sp.lat, lng: p.lng ?? sp.lng } : p;
            });
          }
          return found;
        }
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

// ---------- Schedule helpers ----------
function parseHHMM(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatHHMM(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Offset (in minutes) of every pickup relative to the first one. */
export function getScheduleOffsets(rayon: Rayon): { code: string; offsetMin: number }[] {
  const pts = rayon.pickupPoints || [];
  const first = pts.find((p) => parseHHMM(p.time) != null);
  const baseMin = first ? parseHHMM(first.time)! : 0;
  return pts.map((p) => {
    const m = parseHHMM(p.time);
    return { code: p.code, offsetMin: m == null ? 0 : m - baseMin };
  });
}

/** Returns map of pickupCode → "HH:MM" shifted to start at departTime. */
export function getShiftedSchedule(rayon: Rayon, departTime: string): Map<string, string> {
  const start = parseHHMM(departTime);
  const offsets = getScheduleOffsets(rayon);
  const map = new Map<string, string>();
  if (start == null) {
    offsets.forEach((o) => {
      const p = rayon.pickupPoints.find((x) => x.code === o.code);
      map.set(o.code, p?.time || "");
    });
    return map;
  }
  offsets.forEach((o) => map.set(o.code, formatHHMM(start + o.offsetMin)));
  return map;
}
