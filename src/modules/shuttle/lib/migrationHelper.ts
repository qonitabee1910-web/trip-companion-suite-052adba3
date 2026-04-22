/**
 * Migration Helper - Integrate OSRM with existing shuttle fare system
 *
 * This module provides drop-in functions that wrap the existing
 * fare calculator to gradually migrate to OSRM-based distances
 */

import {
  calcFareBreakdown,
  type VehicleType,
  type ServiceConfig,
} from "../data/services";
import {
  getRayon,
  getRemainingDistanceM,
  getTotalDistanceM,
  type Rayon,
  type PickupPoint,
} from "../data/rayons";
import {
  calcEnhancedFareBreakdown,
  type RefinedRayon,
  type EnhancedFareBreakdown,
} from "./refinedFareCalculator";

/**
 * Feature flag untuk gradual rollout OSRM
 * Set via environment variable atau config
 */
export const OSRM_ENABLED = import.meta.env.VITE_OSRM_ENABLED !== "false"; // Default to true if not explicitly disabled
export const OSRM_FALLBACK = import.meta.env.VITE_OSRM_FALLBACK !== "false"; // fallback on error

/**
 * Kompatibel wrapper untuk existing code
 * Automatically uses OSRM jika enabled, otherwise fallback ke existing
 *
 * Drop-in replacement untuk calcFareBreakdown()
 */
export async function calcFareBreakdownCompat(
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
  pickupCode?: string,
): Promise<any> {
  if (!OSRM_ENABLED) {
    // Use existing implementation
    return calcFareBreakdown(vehicle, service, rayon, pickupCode);
  }

  try {
    // Try new implementation
    const refined = await calcEnhancedFareBreakdown(
      vehicle,
      service,
      rayon as RefinedRayon,
      pickupCode,
      true,
    );
    return refined;
  } catch (error) {
    if (OSRM_FALLBACK) {
      console.warn("OSRM calculation failed, falling back to legacy:", error);
      return calcFareBreakdown(vehicle, service, rayon, pickupCode);
    }
    throw error;
  }
}

/**
 * Kompatibel wrapper untuk calcPrice()
 */
export async function calcPriceCompat(
  vehicle: VehicleType,
  service: ServiceConfig,
  rayon?: Rayon | null,
  pickupCode?: string,
): Promise<number> {
  const bd = await calcFareBreakdownCompat(vehicle, service, rayon, pickupCode);
  return bd.total;
}

/**
 * Feature flag untuk A/B testing
 * Compare OSRM vs hardcoded distances
 */
export async function calcFareBreakdownABTest(
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
  pickupCode?: string,
): Promise<{
  legacy: any;
  osrm: EnhancedFareBreakdown | null;
  difference: { priceRp: number; percentDiff: number };
}> {
  const legacy = calcFareBreakdown(vehicle, service, rayon, pickupCode);

  let osrm: EnhancedFareBreakdown | null = null;
  try {
    osrm = await calcEnhancedFareBreakdown(
      vehicle,
      service,
      rayon as RefinedRayon,
      pickupCode,
      true,
    );
  } catch (error) {
    console.warn("OSRM A/B test failed:", error);
  }

  const priceDiff = osrm ? osrm.total - legacy.total : 0;
  const percentDiff = osrm ? (priceDiff / legacy.total) * 100 : 0;

  return {
    legacy,
    osrm,
    difference: {
      priceRp: priceDiff,
      percentDiff,
    },
  };
}

/**
 * Gradual migration: Convert PickupPoint to RefinedPickupPoint
 * Add routing data while keeping existing distanceToNext
 */
export function convertToRefinedPickupPoint(
  point: PickupPoint,
  routingDistance?: number,
  routingDuration?: number,
): any {
  return {
    ...point,
    routingDistance: routingDistance ?? point.distanceToNext,
    routingDuration: routingDuration ?? point.distanceToNext / 11.1, // ~40 km/h fallback
    routingUpdatedAt: Date.now(),
  };
}

/**
 * Audit function: Compare fare differences between old and new
 * Useful untuk QA dan verification
 */
export async function auditFareDifferences(
  rayonId: string,
  vehicleId: string,
  serviceTier: string,
): Promise<
  {
    pickupCode: string;
    pickupName: string;
    legacyPrice: number;
    osrmPrice: number;
    difference: number;
    percentDiff: number;
  }[]
> {
  const rayon = getRayon(rayonId);
  const vehicle = { id: vehicleId } as VehicleType; // Get from repository in real code
  const service = { tier: serviceTier, priceMultiplier: 1 } as ServiceConfig;

  if (!rayon) return [];

  const results = [];
  for (const point of rayon.pickupPoints || []) {
    if (point.code === "DEST") continue;

    try {
      const abTest = await calcFareBreakdownABTest(
        vehicle,
        service,
        rayon,
        point.code,
      );
      results.push({
        pickupCode: point.code,
        pickupName: point.name,
        legacyPrice: abTest.legacy.total,
        osrmPrice: abTest.osrm?.total || 0,
        difference: abTest.difference.priceRp,
        percentDiff: abTest.difference.percentDiff,
      });
    } catch (error) {
      console.error(`Audit failed for ${point.code}:`, error);
    }
  }

  return results;
}

/**
 * Logging helper untuk monitoring OSRM integration
 */
export interface FareCalculationLog {
  timestamp: number;
  rayonId: string;
  pickupCode: string;
  total: number;
  distanceM: number;
  routingSource: "osrm" | "cached" | "fallback";
  osrmEnabled: boolean;
  error?: string;
}

const calculationLogs: FareCalculationLog[] = [];

export function logFareCalculation(log: FareCalculationLog): void {
  calculationLogs.push(log);

  // Keep only last 1000 entries in memory
  if (calculationLogs.length > 1000) {
    calculationLogs.shift();
  }
}

export function getCalculationLogs(limit = 100): FareCalculationLog[] {
  return calculationLogs.slice(-limit);
}

export function getCalculationStats(): {
  total: number;
  osrmCount: number;
  cachedCount: number;
  fallbackCount: number;
  errorCount: number;
  osrmPercentage: number;
} {
  const total = calculationLogs.length;
  const osrmCount = calculationLogs.filter(
    (l) => l.routingSource === "osrm",
  ).length;
  const cachedCount = calculationLogs.filter(
    (l) => l.routingSource === "cached",
  ).length;
  const fallbackCount = calculationLogs.filter(
    (l) => l.routingSource === "fallback",
  ).length;
  const errorCount = calculationLogs.filter((l) => l.error).length;

  return {
    total,
    osrmCount,
    cachedCount,
    fallbackCount,
    errorCount,
    osrmPercentage: total > 0 ? ((osrmCount + cachedCount) / total) * 100 : 0,
  };
}

/**
 * Debug helper untuk inspect routing data
 */
export function debugRayonRouting(rayon: any): {
  rayonId: string;
  totalPoints: number;
  pointsWithCoordinates: number;
  pointsWithRouting: number;
  lastSyncAge: string;
  pointDetails: Array<{
    code: string;
    name: string;
    hasCoordinates: boolean;
    distanceToNext: number;
    routingDistance?: number;
    routingAge?: string;
  }>;
} {
  const now = Date.now();
  const points = rayon.pickupPoints || [];

  return {
    rayonId: rayon.id,
    totalPoints: points.length,
    pointsWithCoordinates: points.filter((p: any) => p.lat && p.lng).length,
    pointsWithRouting: points.filter((p: any) => p.routingDistance).length,
    lastSyncAge: rayon.routingLastUpdate
      ? `${Math.floor((now - rayon.routingLastUpdate) / 1000 / 60)} minutes ago`
      : "Never",
    pointDetails: points.map((p: any) => ({
      code: p.code,
      name: p.name,
      hasCoordinates: !!(p.lat && p.lng),
      distanceToNext: p.distanceToNext,
      routingDistance: p.routingDistance,
      routingAge: p.routingUpdatedAt
        ? `${Math.floor((now - p.routingUpdatedAt) / 1000 / 60)} minutes ago`
        : "Never",
    })),
  };
}
