/**
 * OSRM Routing Integration
 *
 * Mendapatkan jarak dan waktu akurat antara titik pickup menggunakan Open Source Routing Machine
 * Caching untuk menghindari API calls berlebihan
 */

export interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry?: string; // encoded polyline
  coordinates?: [number, number][]; // decoded coordinates [lat, lng]
  segments?: RouteSegment[];
  source?: "osrm" | "fallback" | "cached";
}

export interface RouteSegment {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  coordinates: [number, number][];
  distance: number; // meters
  duration: number; // seconds
}

export interface RoutingResult {
  segments: RouteSegment[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  code: string;
  source: "osrm" | "cached" | "fallback";
}

export interface OSRMMatrix {
  code: string; // "Ok" or error
  distances: number[][]; // matrix of distances in meters
  durations: number[][]; // matrix of durations in seconds
  source: "osrm" | "fallback" | "cached";
}

/**
 * OSRM Public instances
 * Free tier available, self-hosted juga supported
 */
const OSRM_ENDPOINTS = {
  public: "https://router.project-osrm.org",
  // local: 'http://localhost:5000' // untuk self-hosted
};

// Simple in-memory cache with localStorage persistence
const routeCache = new Map<string, OSRMRoute & { timestamp: number }>();
const matrixCache = new Map<string, { distances: number[][]; durations: number[][]; timestamp: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 hari
const DEFAULT_TIMEOUT = 10000; // Reduced to 10s for better responsiveness

// Request Queue to prevent overwhelming OSRM API
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue: Array<() => void> = [];

/**
 * Queue helper to limit concurrency
 */
async function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => requestQueue.push(resolve));
  }
  
  activeRequests++;
  try {
    return await fn();
  } finally {
    activeRequests--;
    const next = requestQueue.shift();
    if (next) next();
  }
}

/**
 * Initialize cache from localStorage
 */
function initCache() {
  try {
    const routeData = localStorage.getItem("osrm_route_cache");
    if (routeData) {
      const parsed = JSON.parse(routeData);
      Object.entries(parsed).forEach(([k, v]: [string, any]) => {
        if (Date.now() - v.timestamp < CACHE_TTL) {
          routeCache.set(k, v);
        }
      });
    }
    const matrixData = localStorage.getItem("osrm_matrix_cache");
    if (matrixData) {
      const parsed = JSON.parse(matrixData);
      Object.entries(parsed).forEach(([k, v]: [string, any]) => {
        if (Date.now() - v.timestamp < CACHE_TTL) {
          matrixCache.set(k, v);
        }
      });
    }
  } catch (e) {
    console.warn("Failed to load OSRM cache from localStorage", e);
  }
}

/**
 * Persist cache to localStorage
 */
function persistCache() {
  try {
    const routeObj = Object.fromEntries(routeCache.entries());
    localStorage.setItem("osrm_route_cache", JSON.stringify(routeObj));
    const matrixObj = Object.fromEntries(matrixCache.entries());
    localStorage.setItem("osrm_matrix_cache", JSON.stringify(matrixObj));
  } catch (e) {
    // If quota exceeded, clear some entries or ignore
    if (e instanceof Error && e.name === "QuotaExceededError") {
      localStorage.removeItem("osrm_route_cache");
      localStorage.removeItem("osrm_matrix_cache");
    }
  }
}

// Init on load
if (typeof window !== "undefined") {
  initCache();
}

/**
 * Generate cache key from coordinates
 */
function getCacheKey(
  points: Array<{ lat: number; lng: number }>,
  options: { overview?: boolean } = {},
): string {
  const coordPart = points
    .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
    .join("_");
  return `${coordPart}${options.overview ? "_full" : ""}`;
}

/**
 * Decode OSRM polyline encoding (Google's algorithm)
 * Returns array of [lat, lng] coordinates
 */
export function decodePolyline(encoded: string): [number, number][] {
  const poly: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

/**
 * Fetch helper with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT,
) {
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    // Set timeout to abort if request takes too long
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Clear timeout on successful fetch
    if (timeoutId) clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // Clear timeout on error
    if (timeoutId) clearTimeout(timeoutId);

    // Re-throw the error (let caller handle it)
    throw error;
  }
}

/**
 * Retry helper with exponential backoff
 * Useful for handling temporary OSRM API failures
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT,
  maxRetries = 2,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort or last attempt
      if (
        error instanceof Error &&
        (error.name === "AbortError" || attempt === maxRetries)
      ) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff: 500ms, 1000ms, etc.)
      const delayMs = Math.min(500 * Math.pow(2, attempt), 5000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error("Fetch failed");
}

/**
 * Get distance & duration dari cache atau OSRM API
 *
 * @param fromLat - Latitude asal
 * @param fromLng - Longitude asal
 * @param toLat - Latitude tujuan
 * @param toLng - Longitude tujuan
 * @param options - Optional configuration (geometry, etc.)
 * @returns { distance: meters, duration: seconds }
 */
export async function getRouteDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  options: { overview?: boolean; decode?: boolean } = {},
): Promise<OSRMRoute> {
  // If coordinates are same, distance is 0
  if (fromLat === toLat && fromLng === toLng) {
    return { distance: 0, duration: 0, source: "osrm" };
  }

  const points = [
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
  ];
  const cacheKey = getCacheKey(points, { overview: options.overview });

  // Check cache
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      ...cached,
      source: "cached",
    };
  }

  try {
    // OSRM Route service: /route/v1/{profile}/{coordinates}
    const coordStr = `${fromLng},${fromLat};${toLng},${toLat}`;
    const url = new URL(
      `${OSRM_ENDPOINTS.public}/route/v1/driving/${coordStr}`,
    );
    url.searchParams.set("overview", options.overview ? "full" : "false");

    const response = await enqueueRequest(() => fetchWithRetry(url.toString()));
    if (!response || !response.ok) {
      throw new Error(
        `OSRM API error: ${response?.statusText ?? "Bad Request"}`,
      );
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

    if (options.overview && route.geometry) {
      result.geometry = route.geometry;
      if (options.decode) {
        result.coordinates = decodePolyline(route.geometry);
      }
    }

    // Cache result
    routeCache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
    });
    persistCache();

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("OSRM routing request timed out");
    } else {
      console.warn("OSRM routing error:", error);
    }
    throw error;
  }
}

/**
 * Fetch full routing details between multiple points
 * Digunakan oleh map components untuk visualisasi rute di jalan
 */
export async function getRoutingBetweenPoints(
  points: Array<{ lat: number; lng: number }>,
): Promise<RoutingResult | null> {
  if (points.length < 2) return null;

  const cacheKey = `routing_${getCacheKey(points, { overview: true })}`;
  const cached = routeCache.get(cacheKey) as any;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      ...cached,
      source: "cached",
    };
  }

  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `${OSRM_ENDPOINTS.public}/route/v1/driving/${coords}?overview=full&steps=false&annotations=distance,duration`;

    const response = await enqueueRequest(() => fetchWithRetry(url));
    if (!response.ok) throw new Error(`OSRM routing failed: ${response.statusText}`);

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const coordinates = decodePolyline(route.geometry);

    // Calculate segments per leg
    const segments: RouteSegment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const leg = route.legs[i];
      segments.push({
        start: points[i],
        end: points[i + 1],
        coordinates: coordinates, // Simplified: use full coordinates for each segment for React-Leaflet
        distance: leg.distance,
        duration: leg.duration,
      });
    }

    const result: RoutingResult = {
      segments,
      totalDistance: route.distance,
      totalDuration: route.duration,
      code: data.code,
      source: "osrm",
    };

    // Cache it
    routeCache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
    } as any);
    persistCache();

    return result;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
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

  const points = coordinates.map(([lat, lng]) => ({ lat, lng }));
  const cacheKey = `matrix_${getCacheKey(points)}`;

  try {
    // Check cache first
    const cached = matrixCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        code: "Ok",
        distances: cached.distances,
        durations: cached.durations,
        source: "osrm",
      };
    }

    // OSRM Matrix service: /table/v1/{profile}/{coordinates}
    const coordStr = coordinates.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = new URL(
      `${OSRM_ENDPOINTS.public}/table/v1/driving/${coordStr}`,
    );
    url.searchParams.set("annotations", "distance,duration");

    const response = await enqueueRequest(() => fetchWithRetry(url.toString()));
    if (!response) {
      throw new Error("OSRM Matrix API error: No response");
    }
    if (!response.ok) {
      throw new Error(
        `OSRM Matrix API error: ${response.statusText ?? "Bad Request"}`,
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

    // Cache the result
    matrixCache.set(cacheKey, {
      distances: data.distances,
      durations: data.durations || [],
      timestamp: Date.now(),
    });
    persistCache();

    return { ...data, source: "osrm" };
  } catch (error) {
    if (error instanceof TypeError && error.name === "AbortError") {
      console.warn("OSRM matrix request timed out");
    } else if (error instanceof Error && error.message.includes("aborted")) {
      console.warn(`OSRM matrix request aborted: ${error.message}`);
    } else {
      console.warn("OSRM matrix error (falling back):", error);
    }
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
  matrixCache.clear();
  try {
    localStorage.removeItem("osrm_route_cache");
    localStorage.removeItem("osrm_matrix_cache");
  } catch (e) {
    // ignore
  }
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
