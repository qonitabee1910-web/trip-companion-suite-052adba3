/**
 * Refined Shuttle Fare Calculator with OSRM Integration
 *
 * Improvements:
 * - Uses actual routing distances from OSRM instead of hardcoded values
 * - Dynamic distance calculation based on real road network
 * - Accurate time and distance estimates
 * - Caching untuk performance
 * - Better handling untuk multi-stop routes
 */

import {
  getRouteDistance,
  getRouteMatrix,
  getSimpleDistance,
  type OSRMRoute,
} from "./osrmRouting";
import type {
  VehicleType,
  ServiceConfig,
  FareBreakdown,
} from "../data/services";
import type { Rayon, PickupPoint } from "../data/rayons";

export interface RefinedPickupPoint extends PickupPoint {
  routingDistance?: number; // meters from OSRM
  routingDuration?: number; // seconds dari OSRM
  routingUpdatedAt?: number; // timestamp kapan diupdate
}

export interface RefinedRayon extends Rayon {
  pickupPoints: RefinedPickupPoint[];
  routingLastUpdate?: number; // timestamp kapan route ter-update
}

export interface EnhancedFareBreakdown extends FareBreakdown {
  estimatedDurationMin: number; // minutes
  routingSource: "osrm" | "cached" | "fallback";
}

/**
 * Get accurate distance dari OSRM dengan fallback ke cached value
 *
 * Priority:
 * 1. OSRM real-time (jika tersedia)
 * 2. Cached OSRM result (jika available)
 * 3. Stored distanceToNext (legacy fallback)
 */
export async function getAccurateDistance(
  fromPoint: RefinedPickupPoint,
  toPoint: RefinedPickupPoint,
  useCached: boolean = true,
): Promise<{
  distanceM: number;
  durationS: number;
  source: "osrm" | "cached" | "fallback";
}> {
  // Jika routing data valid dan baru (< 7 hari), gunakan
  if (
    useCached &&
    fromPoint.routingDistance !== undefined &&
    toPoint.routingDuration !== undefined
  ) {
    const ageMs = Date.now() - (fromPoint.routingUpdatedAt || 0);
    if (ageMs < 7 * 24 * 60 * 60 * 1000) {
      return {
        distanceM: fromPoint.routingDistance,
        durationS: fromPoint.routingDuration,
        source: "cached",
      };
    }
  }

  // Coba ambil dari OSRM jika coordinates available
  if (fromPoint.lat && fromPoint.lng && toPoint.lat && toPoint.lng) {
    try {
      const route = await getRouteDistance(
        fromPoint.lat,
        fromPoint.lng,
        toPoint.lat,
        toPoint.lng,
      );
      // If OSRM returned a real route, use it
      return {
        distanceM: route.distance,
        durationS: route.duration,
        source: "osrm",
      };
    } catch (error) {
      console.warn(`OSRM routing failed for point to point: ${error}`);
      // Fallback ke legacy if available
      if (fromPoint.distanceToNext && fromPoint.distanceToNext > 0) {
        return {
          distanceM: fromPoint.distanceToNext,
          durationS: fromPoint.distanceToNext / 11.1,
          source: "fallback",
        };
      }
      // If legacy is 0, use simple Haversine calculation
      const fallback = getSimpleDistance(
        fromPoint.lat,
        fromPoint.lng,
        toPoint.lat,
        toPoint.lng,
      );
      return {
        distanceM: fallback.distance,
        durationS: fallback.duration,
        source: "fallback",
      };
    }
  }

  // Fallback ke stored value atau 0
  return {
    distanceM: fromPoint.distanceToNext ?? 0,
    durationS: (fromPoint.distanceToNext ?? 0) / 11.1, // ~40 km/h
    source: "fallback",
  };
}

/**
 * Calculate total distance untuk rayon dengan akurat
 * Menggunakan OSRM matrix query untuk efficiency
 */
export async function calculateRayonDistance(
  rayon: RefinedRayon,
): Promise<{
  totalDistanceM: number;
  estimatedMinutes: number;
  pointsWithDistance: RefinedPickupPoint[];
  source: "osrm" | "fallback";
}> {
  const points = rayon.pickupPoints || [];
  if (points.length < 2) {
    return {
      totalDistanceM: 0,
      estimatedMinutes: 0,
      pointsWithDistance: points,
      source: "fallback",
    };
  }

  // Get routing matrix untuk semua points
  const coordinates: Array<[number, number]> = [];
  const validIndices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    if (points[i].lat !== undefined && points[i].lng !== undefined) {
      coordinates.push([points[i].lat!, points[i].lng!]);
      validIndices.push(i);
    }
  }

  if (validIndices.length < 2) {
    // Fallback jika tidak cukup koordinat
    return {
      totalDistanceM: points.reduce(
        (sum, p) => sum + (p.distanceToNext || 0),
        0,
      ),
      estimatedMinutes: rayon.estimateMin || 0,
      pointsWithDistance: points,
      source: "fallback",
    };
  }

  try {
    const matrixResult = await getRouteMatrix(coordinates);
    const distances = matrixResult.distances;

    // Update distances dan map ke original points
    let totalDistance = 0;
    let totalDuration = 0;
    const updatedPoints = [...points];

    for (let i = 0; i < validIndices.length - 1; i++) {
      const fromIdx = validIndices[i];
      const toIdx = validIndices[i + 1];
      const distance = distances[i][i + 1] || 0;

      updatedPoints[fromIdx] = {
        ...updatedPoints[fromIdx],
        routingDistance: distance,
        routingDuration: Math.round(distance / 11.1), // ~40 km/h
        routingUpdatedAt: Date.now(),
      };

      totalDistance += distance;
      totalDuration += Math.round(distance / 11.1);
    }

    // Mark last point
    if (validIndices.length > 0) {
      const lastIdx = validIndices[validIndices.length - 1];
      updatedPoints[lastIdx] = {
        ...updatedPoints[lastIdx],
        routingDistance: 0,
        routingDuration: 0,
        routingUpdatedAt: Date.now(),
      };
    }

    return {
      totalDistanceM: totalDistance,
      estimatedMinutes: Math.round(totalDuration / 60),
      pointsWithDistance: updatedPoints,
      source: matrixResult.source,
    };
  } catch (error) {
    console.error("Failed to calculate rayon distance:", error);

    // Fallback ke stored values (Legacy method)
    const totalDistanceM = points.reduce(
      (sum, p) => sum + (p.distanceToNext || 0),
      0,
    );

    return {
      totalDistanceM,
      estimatedMinutes: rayon.estimateMin || 0,
      pointsWithDistance: points,
      source: "fallback",
    };
  }
}

/**
 * Get remaining distance dari specific pickup point ke destination
 */
export async function getRemainingDistance(
  rayon: RefinedRayon,
  fromCode: string,
): Promise<{ distanceM: number; durationS: number; source: "osrm" | "cached" | "fallback" }> {
  const points = rayon.pickupPoints || [];
  const fromIdx = points.findIndex((p) => p.code === fromCode);

  if (fromIdx < 0) {
    // Point tidak ditemukan, return total
    const result = await calculateRayonDistance(rayon);
    return {
      distanceM: result.totalDistanceM,
      durationS: result.estimatedMinutes * 60,
      source: result.source,
    };
  }

  // Sum distances dari pickup point sampai akhir
  let totalDistance = 0;
  let totalDuration = 0;
  let source: "osrm" | "cached" | "fallback" = "cached"; // start with optimistic cached

  for (let i = fromIdx; i < points.length - 1; i++) {
    const accurateDistance = await getAccurateDistance(
      points[i],
      points[i + 1],
      true,
    );
    totalDistance += accurateDistance.distanceM;
    totalDuration += accurateDistance.durationS;
    
    // If any segment falls back, the whole thing is degraded
    if (accurateDistance.source === "fallback") source = "fallback";
    else if (accurateDistance.source === "osrm" && source !== "fallback") source = "osrm";
  }

  return { distanceM: totalDistance, durationS: totalDuration, source };
}

/**
 * Enhanced fare calculation dengan OSRM distances
 */
export async function calcEnhancedFareBreakdown(
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon: RefinedRayon | null | undefined,
  pickupCode?: string,
  useOSRM: boolean = true,
): Promise<EnhancedFareBreakdown> {
  if (!rayon) {
    return {
      basePrice: 0,
      distanceM: 0,
      distanceKm: 0,
      farePerKm: 1500,
      multiplier: service.priceMultiplier || 1,
      distanceFare: 0,
      serviceFare: 0,
      surcharge: 0,
      total: 0,
      estimatedDurationMin: 0,
      routingSource: "fallback",
    };
  }

  const farePerKm = rayon.farePerKm ?? 1500;
  let distanceM = 0;
  let durationS = 0;
  let routingSource: "osrm" | "cached" | "fallback" = "fallback";

  if (useOSRM && rayon.perPickupFare && pickupCode) {
    // Calculate sisa jarak dari pickup point
    const remaining = await getRemainingDistance(rayon, pickupCode);
    distanceM = remaining.distanceM;
    durationS = remaining.durationS;
    routingSource = remaining.source;
  } else if (useOSRM) {
    // Calculate total rayon distance
    const result = await calculateRayonDistance(rayon);
    distanceM = result.totalDistanceM;
    durationS = result.estimatedMinutes * 60;
    routingSource = result.source;
  } else {
    // Legacy fallback
    distanceM =
      rayon.pickupPoints
        ?.slice(0, -1)
        .reduce((sum, p) => sum + (p.distanceToNext || 0), 0) || 0;
    durationS = distanceM / 11.1;
    routingSource = "fallback";
  }

  const distanceKm = distanceM / 1000;
  const distanceFare = distanceKm * farePerKm;
  const serviceFare = distanceFare * service.priceMultiplier;
  const surcharge = rayon.surcharge ?? 0;
  const basePrice = vehicle
    ? (vehicle.tierPrices?.[service.tier] ?? vehicle.basePrice ?? 0)
    : 0;
  const total = Math.round((basePrice + serviceFare + surcharge) / 1000) * 1000;
  const estimatedDurationMin = Math.round(durationS / 60);

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
    estimatedDurationMin,
    routingSource,
  };
}

/**
 * Sync rayon distances dengan OSRM
 * Panggil ini periodically (daily/weekly) untuk keep data fresh
 */
export async function syncRayonWithOSRM(
  rayon: RefinedRayon,
): Promise<RefinedRayon> {
  try {
    const result = await calculateRayonDistance(rayon);
    return {
      ...rayon,
      pickupPoints: result.pointsWithDistance,
      routingLastUpdate: Date.now(),
    };
  } catch (error) {
    console.error("Failed to sync rayon with OSRM:", error);
    return rayon;
  }
}
