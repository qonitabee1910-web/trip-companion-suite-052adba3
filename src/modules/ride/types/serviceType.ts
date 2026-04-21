/**
 * Service Type Definitions and Interfaces
 * Defines 3 service types: Standard, Women-Only, Premium Car
 */

export type ServiceTypeId = "standard" | "women" | "car";

export interface ServiceTypeRequirements {
  driverGender?: "any" | "female" | "male";
  riderGender?: "any" | "female" | "male";
  minRating?: number;
  minTrips?: number;
  backgroundChecked?: boolean;
  certifications?: string[];
}

export interface ServiceTypePricing {
  surgeMultiplier: number; // 1.0 = no premium, 1.25 = +25%
  bookingFeeRp: number;     // Additional fee in Rupiah
}

export interface ServiceType {
  id: ServiceTypeId;
  name: string;
  description: string;
  longDescription: string;
  icon: "standard" | "women" | "car";
  badge?: string;
  color: string;
  bgColor: string;
  requirements: ServiceTypeRequirements;
  pricing: ServiceTypePricing;
  features: string[];
}

/**
 * Service Types Configuration
 */
export const SERVICE_TYPES: Record<ServiceTypeId, ServiceType> = {
  standard: {
    id: "standard",
    name: "Ride Standard",
    description: "Driver terverifikasi, harga terjangkau",
    longDescription:
      "Layanan transportasi standar dengan driver profesional dan terverifikasi. Ideal untuk perjalanan sehari-hari dengan harga kompetitif.",
    icon: "standard",
    color: "hsl(202 99% 48%)",
    bgColor: "hsl(202 99% 48% / 0.1)",
    requirements: {
      driverGender: "any",
      riderGender: "any",
      minRating: 4.0,
      minTrips: 0,
      backgroundChecked: true,
    },
    pricing: {
      surgeMultiplier: 1.0,
      bookingFeeRp: 0,
    },
    features: [
      "Driver terverifikasi",
      "Rating minimal 4.0",
      "Harga kompetitif",
      "Tersedia 24/7",
    ],
  },

  women: {
    id: "women",
    name: "Ride Women",
    description: "Driver & penumpang wanita, keamanan terjamin",
    longDescription:
      "Layanan khusus keselamatan wanita dengan driver wanita dan penumpang wanita. Driver telah melalui pelatihan keselamatan khusus.",
    icon: "women",
    badge: "👩 WANITA SAJA",
    color: "hsl(290 100% 50%)",
    bgColor: "hsl(290 100% 50% / 0.1)",
    requirements: {
      driverGender: "female",
      riderGender: "female",
      minRating: 4.8,
      minTrips: 50,
      backgroundChecked: true,
      certifications: ["women-safety-training", "first-aid"],
    },
    pricing: {
      surgeMultiplier: 1.1,
      bookingFeeRp: 2500,
    },
    features: [
      "Driver wanita tersertifikasi",
      "Penumpang wanita saja",
      "Rating minimal 4.8",
      "Pelatihan keselamatan khusus",
      "Fitur tombol darurat",
      "Berbagi lokasi dengan kontak",
    ],
  },

  car: {
    id: "car",
    name: "Ride Car Premium",
    description: "Mobil premium, layanan terbaik, kenyamanan maksimal",
    longDescription:
      "Layanan premium dengan kendaraan berkualitas tinggi dan driver berpengalaman. Sempurna untuk perjalanan bisnis dan acara spesial.",
    icon: "car",
    badge: "⭐ PREMIUM",
    color: "hsl(45 93% 51%)",
    bgColor: "hsl(45 93% 51% / 0.1)",
    requirements: {
      driverGender: "any",
      riderGender: "any",
      minRating: 4.9,
      minTrips: 1000,
      backgroundChecked: true,
      certifications: ["premium-service", "first-aid", "premium-etiquette"],
    },
    pricing: {
      surgeMultiplier: 1.25,
      bookingFeeRp: 5000,
    },
    features: [
      "Driver top-rated (4.9+)",
      "Mobil premium & terawat",
      "Layanan concierge",
      "Air purifier & aromatherapy",
      "Charging port & WiFi",
      "Kursi kulit premium",
      "Minuman & snack tersedia",
      "Priority booking",
    ],
  },
};

/**
 * Get service type by ID
 */
export function getServiceType(id: ServiceTypeId): ServiceType {
  return SERVICE_TYPES[id];
}

/**
 * Get all service types
 */
export function getAllServiceTypes(): ServiceType[] {
  return Object.values(SERVICE_TYPES);
}

/**
 * Check if user meets requirements for service type
 */
export function userMeetsServiceRequirements(
  serviceId: ServiceTypeId,
  userGender: "male" | "female" | "other"
): { meets: boolean; reason?: string } {
  const service = SERVICE_TYPES[serviceId];
  if (!service) {
    return { meets: false, reason: "Service type not found" };
  }

  // Check gender requirement
  if (
    service.requirements.riderGender &&
    service.requirements.riderGender !== "any"
  ) {
    const userGenderValid =
      (service.requirements.riderGender === "female" && userGender === "female") ||
      (service.requirements.riderGender === "male" && userGender === "male");

    if (!userGenderValid) {
      return {
        meets: false,
        reason: `Layanan ini hanya tersedia untuk pengguna ${
          service.requirements.riderGender === "female" ? "wanita" : "pria"
        }`,
      };
    }
  }

  return { meets: true };
}

/**
 * Calculate price multiplier for service type
 */
export function getPriceMultiplier(serviceId: ServiceTypeId): number {
  return SERVICE_TYPES[serviceId]?.pricing.surgeMultiplier ?? 1.0;
}

/**
 * Calculate booking fee for service type
 */
export function getBookingFee(serviceId: ServiceTypeId): number {
  return SERVICE_TYPES[serviceId]?.pricing.bookingFeeRp ?? 0;
}

/**
 * Calculate total fare with service multiplier
 */
export function calculateServiceTypeFare(
  basePrice: number,
  pricePerKm: number,
  distanceKm: number,
  serviceId: ServiceTypeId
): { baseFare: number; multiplier: number; bookingFee: number; totalFare: number } {
  const baseFare = basePrice + pricePerKm * distanceKm;
  const multiplier = getPriceMultiplier(serviceId);
  const bookingFee = getBookingFee(serviceId);
  const totalFare = Math.round(baseFare * multiplier + bookingFee);

  return {
    baseFare,
    multiplier,
    bookingFee,
    totalFare,
  };
}
