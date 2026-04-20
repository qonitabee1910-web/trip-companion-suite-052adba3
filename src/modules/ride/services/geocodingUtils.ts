/**
 * Geocoding utilities and integration helpers for ride module
 */

import type { POI } from "../data/ride";
import { reverseGeocode, forwardGeocode, type ReverseGeocodeResult } from "../services/geocodingService";

/**
 * Convert geocoding result to POI format
 */
export function geocodeResultToPOI(
  name: string,
  address: string,
  lat: number,
  lng: number,
  area?: string
): POI {
  return {
    name: name || address.split(",")[0],
    lat,
    lng,
    area: area || address.split(",").slice(-2).join(",").trim(),
  };
}

/**
 * Enhance POI with geocoding details
 */
export async function enhancePOIWithGeocoding(
  poi: POI
): Promise<POI & { geocodeDetails?: ReverseGeocodeResult }> {
  try {
    const geocodeDetails = await reverseGeocode(poi.lat, poi.lng);
    return {
      ...poi,
      geocodeDetails: geocodeDetails || undefined,
    };
  } catch (error) {
    console.error("Error enhancing POI with geocoding:", error);
    return poi;
  }
}

/**
 * Search addresses and convert to POI array
 */
export async function searchAddressesToPOIs(query: string): Promise<POI[]> {
  if (query.length < 2) return [];

  try {
    const results = await forwardGeocode(query);
    if (!results) return [];

    return results.map((result) =>
      geocodeResultToPOI(result.name, result.address, result.lat, result.lng)
    );
  } catch (error) {
    console.error("Error searching addresses:", error);
    return [];
  }
}

/**
 * Find nearest POI from coordinates
 */
export function findNearestPOI(
  lat: number,
  lng: number,
  pois: POI[]
): POI | null {
  if (pois.length === 0) return null;

  let nearest: POI | null = null;
  let minDistance = Infinity;

  for (const poi of pois) {
    const distance = calculateDistance(lat, lng, poi.lat, poi.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = poi;
    }
  }

  return nearest;
}

/**
 * Calculate distance between two coordinates in km (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get user location preference from localStorage
 */
export function getUserLocationPreference(): {
  lat: number;
  lng: number;
  name: string;
} | null {
  try {
    const stored = localStorage.getItem("userLocationPreference");
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save user location preference to localStorage
 */
export function saveUserLocationPreference(lat: number, lng: number, name: string): void {
  localStorage.setItem("userLocationPreference", JSON.stringify({ lat, lng, name }));
}

/**
 * Get geofence violations (if location moved far from route)
 */
export function checkGeofenceViolation(
  currentLat: number,
  currentLng: number,
  routeLat: number,
  routeLng: number,
  toleranceKm: number = 1
): boolean {
  const distance = calculateDistance(currentLat, currentLng, routeLat, routeLng);
  return distance > toleranceKm;
}

/**
 * Format address for display
 */
export function formatAddressForDisplay(
  address: string,
  maxLength: number = 50
): string {
  if (address.length <= maxLength) return address;

  // Try to shorten by showing only first and last parts
  const parts = address.split(",");
  if (parts.length > 1) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const combined = `${first}, ...${last}`;
    if (combined.length <= maxLength) {
      return combined;
    }
  }

  return address.substring(0, maxLength - 3) + "...";
}

/**
 * Get address component from full address string
 */
export function extractAddressComponents(address: string): {
  street?: string;
  area?: string;
  city?: string;
  country?: string;
} {
  const parts = address.split(",").map((p) => p.trim());

  return {
    street: parts[0],
    area: parts[1],
    city: parts[parts.length - 2],
    country: parts[parts.length - 1],
  };
}
