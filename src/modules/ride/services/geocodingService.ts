/**
 * Geocoding service using OpenStreetMap Nominatim API
 * Converts between coordinates and addresses
 */

export interface GeocodeResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  boundingBox?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface ReverseGeocodeResult {
  address: string;
  name: string;
  county?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Cache to avoid excessive API calls
interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE: Map<string, CacheEntry> = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/**
 * Clear expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of CACHE.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      CACHE.delete(key);
    }
  }
}

/**
 * Get from cache if available and not expired
 */
function getFromCache<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    CACHE.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store in cache
 */
function setCache<T>(key: string, data: T): void {
  CACHE.set(key, { data, timestamp: Date.now() });
}

/**
 * Reverse geocode: convert coordinates to address
 * @param lat Latitude
 * @param lng Longitude
 * @returns Address information
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  const cacheKey = `reverse-${lat.toFixed(6)}-${lng.toFixed(6)}`;

  // Check cache first
  const cached = getFromCache<ReverseGeocodeResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "id-ID",
          "User-Agent": "PYU-GO-Ride-App/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error(`Reverse geocode error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Parse address from Nominatim response
    const address = data.address || {};
    const result: ReverseGeocodeResult = {
      address: data.display_name || "",
      name: address.amenity || address.building || address.road || address.suburb || address.village || "",
      city: address.city || address.town || address.municipality || "",
      county: address.county || "",
      state: address.state || "",
      country: address.country || "",
    };

    // Cache the result
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}

/**
 * Forward geocode: convert address to coordinates
 * @param address Address string to search
 * @returns Coordinates and location details
 */
export async function forwardGeocode(address: string): Promise<GeocodeResult[] | null> {
  const cacheKey = `forward-${address.toLowerCase()}`;

  // Check cache first
  const cached = getFromCache<GeocodeResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=5`,
      {
        headers: {
          "Accept-Language": "id-ID",
          "User-Agent": "PYU-GO-Ride-App/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error(`Forward geocode error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const results: GeocodeResult[] = data.map((item) => ({
      name: item.name || item.display_name.split(",")[0],
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      boundingBox: item.boundingbox
        ? {
            minLat: parseFloat(item.boundingbox[0]),
            maxLat: parseFloat(item.boundingbox[1]),
            minLng: parseFloat(item.boundingbox[2]),
            maxLng: parseFloat(item.boundingbox[3]),
          }
        : undefined,
    }));

    // Cache the results
    setCache(cacheKey, results);

    return results;
  } catch (error) {
    console.error("Forward geocode error:", error);
    return null;
  }
}

/**
 * Search for POIs/addresses with autocomplete
 * @param query Search query
 * @returns Matching locations
 */
export async function geocodeAutocomplete(query: string): Promise<GeocodeResult[] | null> {
  if (query.length < 2) return null;

  const cacheKey = `autocomplete-${query.toLowerCase()}`;

  // Check cache first
  const cached = getFromCache<GeocodeResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=10&featuretype=settlement,administrative`,
      {
        headers: {
          "Accept-Language": "id-ID",
          "User-Agent": "PYU-GO-Ride-App/1.0",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const results: GeocodeResult[] = data.map((item) => ({
      name: item.name || item.display_name.split(",")[0],
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    // Cache the results
    setCache(cacheKey, results);

    return results;
  } catch (error) {
    console.error("Geocode autocomplete error:", error);
    return null;
  }
}

/**
 * Get detailed address from coordinates (includes nearby landmarks)
 * @param lat Latitude
 * @param lng Longitude
 * @returns Detailed location information
 */
export async function getDetailedLocation(
  lat: number,
  lng: number
): Promise<{
  address: string;
  landmark?: string;
  neighborhood?: string;
  city?: string;
} | null> {
  const result = await reverseGeocode(lat, lng);

  if (!result) return null;

  return {
    address: result.address,
    landmark: result.name || undefined,
    neighborhood: result.county || undefined,
    city: result.city || undefined,
  };
}

/**
 * Estimate if coordinates are within reasonable bounds
 * @param lat Latitude
 * @param lng Longitude
 * @returns true if coordinates are valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
} {
  cleanCache();
  return {
    size: CACHE.size,
    entries: Array.from(CACHE.keys()),
  };
}

/**
 * Clear all geocoding cache
 */
export function clearGeocodingCache(): void {
  CACHE.clear();
}
