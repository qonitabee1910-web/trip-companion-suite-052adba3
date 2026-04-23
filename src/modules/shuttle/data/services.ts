import {
  getTotalDistanceM,
  getRemainingDistanceM,
  type Rayon,
  DEFAULT_FARE_PER_KM,
} from "./rayons";
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
  farePerKm: number;
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

/**
 * VehicleTierMapping — Controls which vehicles are allowed for each service tier.
 * Deklaratif: admin centang vehicle mana boleh di tier mana.
 */
export interface VehicleTierMapping {
  id: string;
  vehicle_id: VehicleTypeId;
  tier: ServiceTier;
  allowed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * VehicleAccessLog — Audit trail untuk semua akses vehicle (view, book, bypass).
 * Used untuk monitoring & analytics.
 */
export interface VehicleAccessLog {
  id: string;
  user_id: string | null;
  vehicle_id: VehicleTypeId;
  tier: ServiceTier;
  action: "view" | "book" | "bypass_attempt";
  result: "allowed" | "blocked" | "not_configured";
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const SERVICES: ServiceConfig[] = [
  {
    tier: "reguler",
    label: "Reguler",
    description: "Pilihan ekonomis untuk perjalanan nyaman.",
    farePerKm: 1500,
    features: ["AC dingin", "Air mineral", "Asuransi penumpang"],
    active: true,
  },
  {
    tier: "semi-executive",
    label: "Semi Executive",
    description: "Lebih lapang dengan fasilitas tambahan.",
    farePerKm: 2100,
    features: [
      "AC dingin",
      "Reclining seat",
      "Snack ringan",
      "WiFi onboard",
      "USB charger",
    ],
    active: true,
  },
  {
    tier: "executive",
    label: "Executive",
    description: "Pengalaman premium menuju bandara.",
    farePerKm: 2700,
    features: [
      "Captain seat",
      "Snack box",
      "Selimut & bantal",
      "WiFi cepat",
      "USB charger",
      "Free luggage 25kg",
    ],
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
    tierPrices: {
      reguler: 120000,
      "semi-executive": 160000,
      executive: 220000,
    },
  },
  {
    id: "suv",
    label: "SUV",
    vehicleName: "Premio",
    description: "Lebih privat, ruang kabin luas.",
    active: true,
    tierPrices: {
      reguler: 180000,
      "semi-executive": 230000,
      executive: 300000,
    },
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
export function getVehicleSeatCount(
  vehicleId: VehicleTypeId,
  tier: ServiceTier = "reguler",
): number {
  const key = buildLayoutKey(
    vehicleId as LayoutVehicleId,
    tier as LayoutServiceTier,
  );
  const stored = loadLayoutFromStorage(key);
  const layout = stored || LAYOUT_PRESETS[key];
  return layout.seats.length;
}

/** Ambil harga dasar per (vehicle × tier). Fallback ke basePrice lama jika tidak ada. */
export function getVehicleTierPrice(
  vehicle: VehicleType,
  tier: ServiceTier,
): number {
  const v = vehicle.tierPrices?.[tier];
  if (typeof v === "number") return v;
  return vehicle.basePrice ?? 0;
}

export interface FareBreakdown {
  basePrice: number;
  distanceM: number;
  distanceKm: number;
  farePerKm: number;
  distanceFare: number; // (km * farePerKm)
  surcharge: number;
  total: number; // rounded
}

/**
 * Fare formula:
 *   distanceFare  = (totalDistanceM / 1000) * service.farePerKm
 *   total         = round1k(basePrice + distanceFare + (rayon.surcharge ?? 0))
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
  const farePerKm = service.farePerKm;
  const distanceM = !rayon
    ? 0
    : rayon.perPickupFare && pickupCode
      ? getRemainingDistanceM(rayon, pickupCode)
      : getTotalDistanceM(rayon);
  const distanceKm = distanceM / 1000;
  const distanceFare = distanceKm * farePerKm;
  const surcharge = rayon?.surcharge ?? 0;
  const basePrice = vehicle ? getVehicleTierPrice(vehicle, service.tier) : 0;
  const total =
    Math.round((basePrice + distanceFare + surcharge) / 1000) * 1000;
  return {
    basePrice,
    distanceM,
    distanceKm,
    farePerKm,
    distanceFare,
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
export function mockSeatsAvailable(
  vehicleId: VehicleTypeId,
  tier: ServiceTier,
  totalSeats: number,
): number {
  const seed = (vehicleId.length * 3 + tier.length * 5) % totalSeats;
  return Math.max(1, totalSeats - seed - 1);
}
