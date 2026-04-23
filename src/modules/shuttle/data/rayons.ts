export type RayonId = string;

export interface PickupPoint {
  code: string; // J1, J2…
  name: string;
  time: string; // "06:00"
  distanceToNext: number; // meters; 0 untuk titik terakhir (kept for fallback)

  // OSRM routing data (optional)
  routingDistance?: number; // actual distance in meters from OSRM
  routingDuration?: number; // duration in seconds from OSRM
  routingUpdatedAt?: number; // timestamp when last updated

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

  // Rayon-level routing metadata
  routingLastUpdate?: number; // when entire rayon was last synced
  routingDataQuality?: "exact" | "estimated" | "fallback";
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

import {
  SEED_RAYONS_PYUGO as SEED,
  RAYONS as R,
  DEPART_TIMES as T,
  DEFAULT_DESTINATION as DD,
  DEFAULT_CONTENT as DC,
} from "./rayons.seed";

export const SEED_RAYONS_PYUGO = SEED;
export const RAYONS = R;
export const DEPART_TIMES = T;
export const DEFAULT_DESTINATION = DD;
export const DEFAULT_CONTENT = DC;
export const DESTINATION = DD;

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
  return (rayon.pickupPoints || []).reduce(
    (sum, p) => sum + (p.distanceToNext || 0),
    0,
  );
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

// NOTE: getRayon/getDestination/getContent now read from cloudCache (Supabase-backed).
// We use a lazy import pattern to avoid circular imports between rayons.ts and cloudStore.ts
// at module evaluation time.

export function getRayon(id: string): Rayon | undefined {
  return _cc.rayons.find((r) => r.id.toUpperCase() === id.toUpperCase());
}

export function getDestination(): Destination {
  return _cc.destination;
}

export function getContent(): ShuttleContent {
  return _cc.content;
}

// NOTE: getRayon/getDestination/getContent now read from cloudCache (Supabase-backed).
import { cloudCache as _cc } from "./cloudStore";

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
export function getScheduleOffsets(
  rayon: Rayon,
): { code: string; offsetMin: number }[] {
  const pts = rayon.pickupPoints || [];
  const first = pts.find((p) => parseHHMM(p.time) != null);
  const baseMin = first ? parseHHMM(first.time)! : 0;
  return pts.map((p) => {
    const m = parseHHMM(p.time);
    return { code: p.code, offsetMin: m == null ? 0 : m - baseMin };
  });
}

/** Returns map of pickupCode → "HH:MM" shifted to start at departTime. */
export function getShiftedSchedule(
  rayon: Rayon,
  departTime: string,
): Map<string, string> {
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
