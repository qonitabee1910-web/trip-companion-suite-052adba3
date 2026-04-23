/**
 * Routing Sync Service
 * 
 * Bertanggung jawab untuk melakukan batch syncing data OSRM untuk seluruh rayon.
 * Digunakan oleh admin dashboard untuk memastikan data routing selalu up-to-date.
 */

import { getRoutingBetweenPoints } from "../lib/osrmRouting";
import { SEED_RAYONS_PYUGO, type Rayon } from "../data/rayons";

export interface SyncResult {
  rayonId: string;
  success: boolean;
  pointsSynced: number;
  totalDistance: number;
  error?: string;
}

/**
 * Sync data routing untuk satu rayon
 */
export async function syncRayonRouting(rayon: Rayon): Promise<SyncResult> {
  try {
    const points = rayon.pickupPoints;
    if (points.length < 2) {
      return {
        rayonId: rayon.id,
        success: true,
        pointsSynced: 0,
        totalDistance: 0
      };
    }

    // Filter points that have coordinates
    const validPoints = points.filter(p => p.lat !== undefined && p.lng !== undefined) as Array<{lat: number, lng: number}>;
    
    if (validPoints.length < 2) {
      return {
        rayonId: rayon.id,
        success: false,
        pointsSynced: 0,
        totalDistance: 0,
        error: "Insufficient coordinates"
      };
    }

    // Fetch full route from OSRM (this will also populate the cache)
    const result = await getRoutingBetweenPoints(validPoints);
    
    if (!result) {
      return {
        rayonId: rayon.id,
        success: false,
        pointsSynced: 0,
        totalDistance: 0,
        error: "OSRM request failed"
      };
    }

    return {
      rayonId: rayon.id,
      success: true,
      pointsSynced: validPoints.length,
      totalDistance: result.totalDistance
    };
  } catch (error) {
    return {
      rayonId: rayon.id,
      success: false,
      pointsSynced: 0,
      totalDistance: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Sync data routing untuk seluruh rayon yang ada di sistem
 */
export async function syncAllRayons(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  for (const rayon of SEED_RAYONS_PYUGO) {
    const result = await syncRayonRouting(rayon);
    results.push(result);
  }
  
  return results;
}

/**
 * Helper untuk mengecek status sync rayon
 */
export function getRayonSyncStatus(rayon: Rayon) {
  const total = rayon.pickupPoints.length;
  const withCoords = rayon.pickupPoints.filter(p => p.lat !== undefined && p.lng !== undefined).length;
  
  return {
    rayonId: rayon.id,
    totalPoints: total,
    pointsWithCoordinates: withCoords,
    readyForSync: withCoords >= 2,
    completeness: total > 0 ? (withCoords / total) * 100 : 0
  };
}
