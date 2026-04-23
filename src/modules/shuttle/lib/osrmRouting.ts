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
  source?: "osrm" | "fallback";
}

export interface OSRMMatrix {
  code: string; // "Ok" or error
  distances: number[][]; // matrix of distances in meters
  durations: number[][]; // matrix of durations in seconds
  source: "osrm" | "fallback";
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
  // If coordinates are same, distance is 0
  if (fromLat === toLat && fromLng === toLng) {
    return { distance: 0, duration: 0 };
  }

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
    // OSRM Route service: /route/v1/{profile}/{coordinates}
    const coordStr = `${fromLng},${fromLat};${toLng},${toLat}`;
    const url = new URL(`${OSRM_ENDPOINTS.public}/route/v1/driving/${coordStr}`);
    url.searchParams.set("overview", "false"); // Don't need geometry for now

    const response = await fetch(url.toString());
    if (!response || !response.ok) {
      throw new Error(`OSRM API error: ${response?.statusText ?? "No response"}`);
    }

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM error: ${data.code}`);
    }

    const route = data.routes[0];
    const result: OSRMRoute = {
      distance: Math.round(route.distance),
      duration: Math.round(route.duration),
      source: "osrm",
    };

    // Cache result
    routeCache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error("OSRM routing error:", error);
    // Rethrow to let caller handle legacy fallback
    throw error;
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
): Promise<OSRMMatrix> {
  if (coordinates.length === 0) {
    return { code: "Ok", distances: [], durations: [], source: "osrm" };
  }
  if (coordinates.length === 1) {
    return { code: "Ok", distances: [[0]], durations: [[0]], source: "osrm" };
  }

  const cacheKey = `matrix_${coordinates.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join("|")}`;

  try {
    // OSRM Matrix service: /table/v1/{profile}/{coordinates}
    const coordStr = coordinates.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = new URL(`${OSRM_ENDPOINTS.public}/table/v1/driving/${coordStr}`);
    url.searchParams.set("annotations", "distance,duration");

    const response = await fetch(url.toString());
    if (!response || !response.ok) {
      throw new Error(
        `OSRM Matrix API error: ${response?.statusText ?? "No response"}`,
      );
    }

    const data: OSRMMatrix = await response.json();
    if (data.code !== "Ok") {
      console.error("OSRM Matrix API returned non-OK code:", data.code, data);
      throw new Error(`OSRM Matrix error: ${data.code}`);
    }

    if (!data.distances) {
      console.error("OSRM Matrix API response missing distances:", data);
      throw new Error("OSRM Matrix missing distances");
    }

    return { ...data, source: "osrm" };
  } catch (error) {
    console.error("OSRM matrix error:", error);
    // Rethrow to let the caller handle fallback to legacy distances
    throw error;
  }
}

/**
 * Haversine formula untuk fallback simple distance calculation
 * Hanya untuk emergency, bukan hasil routing yang akurat
 */
export function getSimpleDistance(
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
    routingDistance?: number;
    routingDuration?: number;
    routingUpdatedAt?: number;
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
  const matrixResult = await getRouteMatrix(coordinates);
  const distances = matrixResult.distances;

  // Map distances to distanceToNext and routing fields
  const updated = validPoints.map((point, idx) => {
    const isLast = idx === validPoints.length - 1;
    const distanceToNext = isLast ? 0 : distances[idx][idx + 1] || 0;
    
    return {
      ...point,
      distanceToNext,
      routingDistance: distanceToNext,
      routingDuration: isLast ? 0 : Math.round(distanceToNext / 11.1), // rough estimate from matrix
      routingUpdatedAt: Date.now(),
    };
  });

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
