/**
 * Routing Service menggunakan OSRM (Open Source Routing Machine)
 * Menghitung rute real-world antar pickup points dengan distance & duration
 */

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
}

const OSRM_API = "https://router.project-osrm.org/route/v1";

/**
 * Fetch route dari OSRM API
 * Supports hingga 25 waypoints per request
 */
export async function getRoutingBetweenPoints(
  points: Array<{ lat: number; lng: number }>,
): Promise<RoutingResult | null> {
  if (points.length < 2) return null;

  try {
    // Build OSRM coordinate string: lng,lat;lng,lat;...
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `${OSRM_API}/driving/${coords}?overview=full&steps=false&annotations=distance,duration`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("OSRM routing failed:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("OSRM returned invalid data:", data);
      return null;
    }

    const route = data.routes[0];
    const geometry = route.geometry;

    // Decode polyline (OSRM returns encoded polyline by default)
    const coordinates = decodePolyline(geometry);

    // Calculate segments
    const segments: RouteSegment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      // Get route legs
      const leg = route.legs[i];
      segments.push({
        start: points[i],
        end: points[i + 1],
        coordinates: coordinates,
        distance: leg.distance,
        duration: leg.duration,
      });
    }

    return {
      segments,
      totalDistance: route.distance,
      totalDuration: route.duration,
      code: data.code,
    };
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

/**
 * Decode OSRM polyline encoding (Google's algorithm)
 * Returns array of [lat, lng] coordinates
 */
function decodePolyline(encoded: string): [number, number][] {
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
