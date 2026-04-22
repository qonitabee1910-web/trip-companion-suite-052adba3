/**
 * OSRM Routing Integration
 *
 * Mendapatkan jarak dan waktu akurat antara titik pickup menggunakan Open Source Routing Machine
 * Caching untuk menghindari API calls berlebihan
 */

export interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry?: string; // encoded polyline (optional)
}

export interface OSRMMatrix {
  code: string; // "Ok" or error
  distances: number[][]; // matrix of distances in meters
  durations: number[][]; // matrix of durations in seconds
}

/**
 * OSRM Public instances
 * Free tier available, self-hosted juga supported
 */
const OSRM_ENDPOINTS = {
  public: "https://router.project-osrm.org",
  // local: 'http://localhost:5000' // untuk self-hosted
};

// Simple in-memory cache untuk route distances
// Dalam production, gunakan Redis atau database
const routeCache = new Map<
  string,
  { distance: number; duration: number; timestamp: number }
>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 hari

/**
 * Generate cache key dari koordinat pair
 */
function getCacheKey(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  // Round ke 4 desimal untuk fuzzy matching (~11 meter precision)
  const f = [fromLat.toFixed(4), fromLng.toFixed(4)].join(",");
  const t = [toLat.toFixed(4), toLng.toFixed(4)].join(",");
  return `${f}|${t}`;
}

/**
 * Get distance & duration dari cache atau OSRM API
 *
 * @param fromLat - Latitude asal
 * @param fromLng - Longitude asal
 * @param toLat - Latitude tujuan
 * @param toLng - Longitude tujuan
 * @returns { distance: meters, duration: seconds }
 */
export async function getRouteDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<OSRMRoute> {
  const cacheKey = getCacheKey(fromLat, fromLng, toLat, toLng);

  // Check cache
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      distance: cached.distance,
      duration: cached.duration,
    };
  }

  try {
    // OSRM Route service
    const url = new URL("/route/v1/driving", OSRM_ENDPOINTS.public);
    url.searchParams.set(
      "coordinates",
      `${fromLng},${fromLat};${toLng},${toLat}`,
    );
    url.searchParams.set("overview", "false"); // Don't need geometry for now

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM error: ${data.code}`);
    }

    const route = data.routes[0];
    const result = {
      distance: Math.round(route.distance),
      duration: Math.round(route.duration),
    };

    // Cache result
    routeCache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error("OSRM routing error:", error);
    // Fallback ke simple distance calculation jika API fails
    return getSimpleDistance(fromLat, fromLng, toLat, toLng);
  }
}

/**
 * Get multiple route distances (matrix query untuk efficiency)
 *
 * @param coordinates - Array of [lat, lng] pairs
 * @returns Matrix of distances in meters
 */
export async function getRouteMatrix(
  coordinates: Array<[number, number]>,
): Promise<number[][]> {
  if (coordinates.length < 2) return [];

  const cacheKey = `matrix_${coordinates.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join("|")}`;

  try {
    // OSRM Matrix service
    const url = new URL("/table/v1/driving", OSRM_ENDPOINTS.public);
    const coordStr = coordinates.map(([lat, lng]) => `${lng},${lat}`).join(";");
    url.searchParams.set("coordinates", coordStr);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`OSRM Matrix API error: ${response.statusText}`);
    }

    const data: OSRMMatrix = await response.json();
    if (data.code !== "Ok") {
      throw new Error(`OSRM Matrix error: ${data.code}`);
    }

    return data.distances;
  } catch (error) {
    console.error("OSRM matrix error:", error);
    // Fallback ke simple distance matrix
    return getSimpleDistanceMatrix(coordinates);
  }
}

/**
 * Haversine formula untuk fallback simple distance calculation
 * Hanya untuk emergency, bukan hasil routing yang akurat
 */
function getSimpleDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): OSRMRoute {
  const R = 6371000; // Earth radius in meters
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = Math.round(R * c);

  // Rough estimate: avg speed 40 km/h (11.1 m/s)
  const duration = Math.round(distance / 11.1);

  return { distance, duration };
}

/**
 * Haversine matrix calculation untuk fallback
 */
function getSimpleDistanceMatrix(
  coordinates: Array<[number, number]>,
): number[][] {
  const n = coordinates.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        const [fromLat, fromLng] = coordinates[i];
        const [toLat, toLng] = coordinates[j];
        const route = getSimpleDistance(fromLat, fromLng, toLat, toLng);
        matrix[i][j] = route.distance;
      }
    }
  }

  return matrix;
}

/**
 * Update rayon distances dari OSRM
 * Panggil ini saat setup untuk populate jarak akurat
 */
export async function updateRayonDistances(
  pickupPoints: Array<{
    lat?: number;
    lng?: number;
    code: string;
    name: string;
  }>,
): Promise<
  Array<{
    code: string;
    name: string;
    distanceToNext: number;
    lat?: number;
    lng?: number;
  }>
> {
  const validPoints = pickupPoints.filter(
    (p) => p.lat !== undefined && p.lng !== undefined,
  );

  if (validPoints.length < 2) {
    console.warn("Not enough points with coordinates for routing");
    return pickupPoints as any;
  }

  // Get matrix of distances
  const coordinates = validPoints.map(
    (p) => [p.lat!, p.lng!] as [number, number],
  );
  const distances = await getRouteMatrix(coordinates);

  // Map distances to distanceToNext
  const updated = validPoints.map((point, idx) => ({
    ...point,
    distanceToNext:
      idx < validPoints.length - 1 ? distances[idx][idx + 1] || 0 : 0,
  }));

  return updated;
}

/**
 * Clear cache (for testing atau manual refresh)
 */
export function clearRouteCache(): void {
  routeCache.clear();
}

/**
 * Get cache stats
 */
export function getRouteCacheStats(): { size: number; entries: number } {
  return {
    size: new Map(
      Array.from(routeCache.entries()).filter(
        ([, v]) => Date.now() - v.timestamp < CACHE_TTL,
      ),
    ).size,
    entries: routeCache.size,
  };
}
