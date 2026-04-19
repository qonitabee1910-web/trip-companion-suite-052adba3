import { getTotalDistanceM, getRemainingDistanceM, type Rayon, DEFAULT_FARE_PER_KM } from "./rayons";
import {
  buildLayoutKey,
  loadLayoutFromStorage,
  LAYOUT_PRESETS,
  type ServiceTier as LayoutServiceTier,
  type VehicleId as LayoutVehicleId,
} from "./seatLayouts";

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

/**
 * VehicleType — kapasitas kursi & harga dasar TIDAK lagi disimpan langsung di sini.
 * - Kapasitas = jumlah kursi pada layout di Seat Editor (sumber tunggal).
 * - Harga dasar per (vehicle × tier) tersimpan di `tierPrices`.
 *
 * Field `totalSeats` & `basePrice` dipertahankan opsional untuk back-compat data lama
 * di localStorage; kode baru harus pakai helper getVehicleSeatCount/getVehicleTierPrice.
 */
export interface VehicleType {
  id: VehicleTypeId;
  label: string;
  vehicleName: string;
  description: string;
  active?: boolean;
  /** Harga dasar per service tier (Rp). */
  tierPrices?: Partial<Record<ServiceTier, number>>;
  /** @deprecated derived dari layout — jangan diedit langsung */
  totalSeats?: number;
  /** @deprecated lihat tierPrices */
  basePrice?: number;
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
    description: "Kapasitas besar, cocok rombongan keluarga.",
    active: true,
    tierPrices: { reguler: 120000, "semi-executive": 160000, executive: 220000 },
  },
  {
    id: "suv",
    label: "SUV",
    vehicleName: "Premio",
    description: "Lebih privat, ruang kabin luas.",
    active: true,
    tierPrices: { reguler: 180000, "semi-executive": 230000, executive: 300000 },
  },
  {
    id: "minicar",
    label: "Mini Car",
    vehicleName: "Elf Mini",
    description: "Hemat untuk solo & pasangan.",
    active: true,
    tierPrices: { reguler: 95000, "semi-executive": 130000, executive: 175000 },
  },
];

import { cloudCache as _cc } from "./cloudStore";

export function getService(tier: string): ServiceConfig | undefined {
  return _cc.services.find((s) => s.tier === tier);
}

export function getVehicleType(id: string): VehicleType | undefined {
  return _cc.vehicles.find((v) => v.id === id);
}

/**
 * Hitung kapasitas kursi dari seat layout (sumber tunggal).
 * Tidak butuh tier? gunakan reguler sebagai default.
 */
export function getVehicleSeatCount(vehicleId: VehicleTypeId, tier: ServiceTier = "reguler"): number {
  const key = buildLayoutKey(vehicleId as LayoutVehicleId, tier as LayoutServiceTier);
  const stored = loadLayoutFromStorage(key);
  const layout = stored || LAYOUT_PRESETS[key];
  return layout.seats.length;
}

/** Ambil harga dasar per (vehicle × tier). Fallback ke basePrice lama jika tidak ada. */
export function getVehicleTierPrice(vehicle: VehicleType, tier: ServiceTier): number {
  const v = vehicle.tierPrices?.[tier];
  if (typeof v === "number") return v;
  return vehicle.basePrice ?? 0;
}

export interface FareBreakdown {
  basePrice: number;
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
 * Fare formula:
 *   distanceFare  = (totalDistanceM / 1000) * farePerKm
 *   serviceFare   = distanceFare * service.priceMultiplier
 *   total         = round1k(basePrice + serviceFare + (rayon.surcharge ?? 0))
 *
 * basePrice = vehicle.tierPrices[tier] (atau 0 bila tidak diset)
 * Jika rayon.perPickupFare aktif & pickupCode ada, jarak diukur sisa dari titik tsb.
 */
export function calcFareBreakdown(
  vehicle: VehicleType | null | undefined,
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
  const basePrice = vehicle ? getVehicleTierPrice(vehicle, service.tier) : 0;
  const total = Math.round((basePrice + serviceFare + surcharge) / 1000) * 1000;
  return {
    basePrice,
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
