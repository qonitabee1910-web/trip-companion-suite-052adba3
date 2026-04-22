/**
 * Fare calculation utilities for pickup point-based pricing.
 * 
 * Supports both:
 * - Full route fare (default)
 * - Per-pickup-point fare (when perPickupFare flag is enabled)
 */

import {
  getVehicleTierPrice,
  type ServiceConfig,
  type VehicleType,
  type FareBreakdown,
  DEFAULT_FARE_PER_KM,
} from "../data/services";
import { getRayon, getRemainingDistanceM, getTotalDistanceM, type Rayon } from "../data/rayons";
import { calcFareBreakdownCompat } from "./migrationHelper";

export interface PickupFareInfo {
  code: string;
  name: string;
  distanceM: number;
  distanceKm: number;
  fareBreakdown: FareBreakdown;
  unitPrice: number;
  routingSource?: string;
}

/**
 * Calculate fare for a specific pickup point.
 * If perPickupFare is enabled, calculates distance from that point.
 * Otherwise, returns full route fare.
 */
export async function getPickupPointFare(
  pickupCode: string,
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
): Promise<PickupFareInfo | null> {
  if (!rayon) return null;

  const pickup = rayon.pickupPoints?.find((p) => p.code === pickupCode);
  if (!pickup) return null;

  const breakdown = await calcFareBreakdownCompat(vehicle, service, rayon, pickupCode);

  return {
    code: pickup.code,
    name: pickup.name,
    distanceM: breakdown.distanceM,
    distanceKm: breakdown.distanceKm,
    fareBreakdown: breakdown,
    unitPrice: breakdown.total,
    routingSource: breakdown.routingSource,
  };
}

/**
 * Calculate all pickup point fares for a rayon.
 * Useful for displaying a fare matrix.
 */
export async function getAllPickupPointFares(
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
): Promise<PickupFareInfo[]> {
  if (!rayon) return [];

  const promises = (rayon.pickupPoints || [])
    .filter((p) => p.code !== "DEST")
    .map((p) => getPickupPointFare(p.code, vehicle, service, rayon));

  const results = await Promise.all(promises);
  return results.filter((info): info is PickupFareInfo => info !== null);
}

/**
 * Get fare difference between two pickup points.
 * Useful for showing price reduction/increase when changing pickup.
 */
export async function getFareDifference(
  fromCode: string,
  toCode: string,
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
): Promise<number | null> {
  const fromFare = await getPickupPointFare(fromCode, vehicle, service, rayon);
  const toFare = await getPickupPointFare(toCode, vehicle, service, rayon);

  if (!fromFare || !toFare) return null;

  return toFare.unitPrice - fromFare.unitPrice;
}

/**
 * Format pickup point info for display.
 * Shows distance and price per pax.
 */
export function formatPickupFareDisplay(info: PickupFareInfo, pax: number = 1): {
  pickupName: string;
  distanceLabel: string;
  perPaxPrice: number;
  totalPrice: number;
} {
  return {
    pickupName: info.name,
    distanceLabel: `${info.distanceKm.toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} km`,
    perPaxPrice: info.unitPrice,
    totalPrice: info.unitPrice * pax,
  };
}
