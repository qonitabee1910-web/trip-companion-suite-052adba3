/**
 * Routing Service Bridge
 * 
 * Menghubungkan admin components dengan central OSRM routing logic di shuttle module.
 * Memberikan helper tambahan untuk formatting display.
 */

import { 
  getRoutingBetweenPoints as getRouting,
  type RouteSegment as BaseRouteSegment,
  type RoutingResult as BaseRoutingResult
} from "@/modules/shuttle/lib/osrmRouting";

export type RouteSegment = BaseRouteSegment;
export type RoutingResult = BaseRoutingResult;

/**
 * Fetch route dari central OSRM routing service
 */
export async function getRoutingBetweenPoints(
  points: Array<{ lat: number; lng: number }>,
): Promise<RoutingResult | null> {
  return getRouting(points);
}

/**
 * Format distance untuk display
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration untuk display
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 menit";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
