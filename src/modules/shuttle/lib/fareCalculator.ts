/**
 * Fare calculation utilities for pickup point-based pricing.
 * 
 * Supports both:
 * - Full route fare (default)
 * - Per-pickup-point fare (when perPickupFare flag is enabled)
 */

import {
  calcFareBreakdown,
  getVehicleTierPrice,
  type ServiceConfig,
  type VehicleType,
  type FareBreakdown,
  DEFAULT_FARE_PER_KM,
} from "../data/services";
import { getRayon, getRemainingDistanceM, getTotalDistanceM, type Rayon } from "../data/rayons";

export interface PickupFareInfo {
  code: string;
  name: string;
  distanceM: number;
  distanceKm: number;
  fareBreakdown: FareBreakdown;
  unitPrice: number;
}

/**
 * Calculate fare for a specific pickup point.
 * If perPickupFare is enabled, calculates distance from that point.
 * Otherwise, returns full route fare.
 */
export function getPickupPointFare(
  pickupCode: string,
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
): PickupFareInfo | null {
  if (!rayon) return null;

  const pickup = rayon.pickupPoints?.find((p) => p.code === pickupCode);
  if (!pickup) return null;

  const breakdown = calcFareBreakdown(vehicle, service, rayon, pickupCode);

  return {
    code: pickup.code,
    name: pickup.name,
    distanceM: breakdown.distanceM,
    distanceKm: breakdown.distanceKm,
    fareBreakdown: breakdown,
    unitPrice: breakdown.total,
  };
}

/**
 * Calculate all pickup point fares for a rayon.
 * Useful for displaying a fare matrix.
 */
export function getAllPickupPointFares(
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
): PickupFareInfo[] {
  if (!rayon) return [];

  return (rayon.pickupPoints || [])
    .filter((p) => p.code !== "DEST")
    .map((p) => getPickupPointFare(p.code, vehicle, service, rayon))
    .filter((info): info is PickupFareInfo => info !== null);
}

/**
 * Get fare difference between two pickup points.
 * Useful for showing price reduction/increase when changing pickup.
 */
export function getFareDifference(
  fromCode: string,
  toCode: string,
  vehicle: VehicleType | null | undefined,
  service: ServiceConfig,
  rayon?: Rayon | null,
): number | null {
  const fromFare = getPickupPointFare(fromCode, vehicle, service, rayon);
  const toFare = getPickupPointFare(toCode, vehicle, service, rayon);

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
