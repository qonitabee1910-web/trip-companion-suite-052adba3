import { getTotalDistanceM, getRemainingDistanceM, type Rayon, DEFAULT_FARE_PER_KM } from "./rayons";

export type ServiceTier = "reguler" | "semi-executive" | "executive";
export type VehicleTypeId = "hiace" | "suv" | "minicar";

export interface ServiceConfig {
  tier: ServiceTier;
  label: string;
  description: string;
  priceMultiplier: number;
  features: string[];
  active?: boolean;
}

export interface VehicleType {
  id: VehicleTypeId;
  label: string;
  vehicleName: string;
  totalSeats: number;
  basePrice: number;
  description: string;
  active?: boolean;
}

export const SERVICES: ServiceConfig[] = [
  {
    tier: "reguler",
    label: "Reguler",
    description: "Pilihan ekonomis untuk perjalanan nyaman.",
    priceMultiplier: 1.0,
    features: ["AC dingin", "Air mineral", "Asuransi penumpang"],
    active: true,
  },
  {
    tier: "semi-executive",
    label: "Semi Executive",
    description: "Lebih lapang dengan fasilitas tambahan.",
    priceMultiplier: 1.4,
    features: ["AC dingin", "Reclining seat", "Snack ringan", "WiFi onboard", "USB charger"],
    active: true,
  },
  {
    tier: "executive",
    label: "Executive",
    description: "Pengalaman premium menuju bandara.",
    priceMultiplier: 1.8,
    features: ["Captain seat", "Snack box", "Selimut & bantal", "WiFi cepat", "USB charger", "Free luggage 25kg"],
    active: true,
  },
];

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: "hiace",
    label: "HiAce",
    vehicleName: "HiAce Premium",
    totalSeats: 12,
    basePrice: 120000,
    description: "Kapasitas besar, cocok rombongan keluarga.",
    active: true,
  },
  {
    id: "suv",
    label: "SUV",
    vehicleName: "Premio",
    totalSeats: 6,
    basePrice: 180000,
    description: "Lebih privat, ruang kabin luas.",
    active: true,
  },
  {
    id: "minicar",
    label: "Mini Car",
    vehicleName: "Elf Mini",
    totalSeats: 4,
    basePrice: 95000,
    description: "Hemat untuk solo & pasangan.",
    active: true,
  },
];

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getService(tier: string): ServiceConfig | undefined {
  return readLS<ServiceConfig[]>("shuttle-admin:services", SERVICES).find((s) => s.tier === tier);
}

export function getVehicleType(id: string): VehicleType | undefined {
  return readLS<VehicleType[]>("shuttle-admin:vehicles", VEHICLE_TYPES).find((v) => v.id === id);
}

export interface FareBreakdown {
  distanceM: number;
  distanceKm: number;
  farePerKm: number;
  multiplier: number;
  distanceFare: number; // (km * farePerKm)
  serviceFare: number; // distanceFare * multiplier
  surcharge: number;
  total: number; // rounded
}

/**
 * Fare formula (per plan):
 *   distanceFare  = (totalDistanceM / 1000) * farePerKm
 *   serviceFare   = distanceFare * service.priceMultiplier
 *   total         = round1k(serviceFare + (rayon.surcharge ?? 0))
 *
 * Jika rayon.perPickupFare aktif & pickupCode ada, jarak diukur sisa dari titik tsb.
 */
export function calcFareBreakdown(
  _vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
  pickupCode?: string,
): FareBreakdown {
  const farePerKm = rayon?.farePerKm ?? DEFAULT_FARE_PER_KM;
  const distanceM = !rayon
    ? 0
    : rayon.perPickupFare && pickupCode
    ? getRemainingDistanceM(rayon, pickupCode)
    : getTotalDistanceM(rayon);
  const distanceKm = distanceM / 1000;
  const distanceFare = distanceKm * farePerKm;
  const serviceFare = distanceFare * service.priceMultiplier;
  const surcharge = rayon?.surcharge ?? 0;
  const total = Math.round((serviceFare + surcharge) / 1000) * 1000;
  return {
    distanceM,
    distanceKm,
    farePerKm,
    multiplier: service.priceMultiplier,
    distanceFare,
    serviceFare,
    surcharge,
    total,
  };
}

export function calcPrice(
  vehicle: VehicleType,
  service: ServiceConfig,
  rayon?: Rayon | null,
  pickupCode?: string,
): number {
  return calcFareBreakdown(vehicle, service, rayon, pickupCode).total;
}

// Deprecated
export function mockSeatsAvailable(vehicleId: VehicleTypeId, tier: ServiceTier, totalSeats: number): number {
  const seed = (vehicleId.length * 3 + tier.length * 5) % totalSeats;
  return Math.max(1, totalSeats - seed - 1);
}
