import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  getRouteDistance,
  getRouteMatrix,
  updateRayonDistances,
  clearRouteCache,
  getRouteCacheStats,
} from "../osrmRouting";
import type { PickupPoint } from "../../data/rayons";

describe("osrmRouting", () => {
  beforeAll(() => {
    clearRouteCache();
    // Proper mock for fetch
    vi.stubGlobal(
      "fetch",
      vi.fn(async (urlStr: string) => {
        const url = new URL(urlStr);
        if (url.pathname.includes("/route/v1/driving")) {
          return {
            ok: true,
            json: async () => ({
              code: "Ok",
              routes: [{ distance: 1000, duration: 60 }],
            }),
          };
        }
        if (url.pathname.includes("/table/v1/driving")) {
          // Extract coordinates from pathname: /table/v1/driving/{lng},{lat};{lng},{lat}...
          const pathMatch = url.pathname.match(/\/table\/v1\/driving\/(.+)$/);
          const coordsStr = pathMatch ? pathMatch[1] : "";
          const coordPairs = coordsStr.split(";").filter(Boolean);
          const n = coordPairs.length;
          const distances = Array(n)
            .fill(0)
            .map((_, i) =>
              Array(n)
                .fill(0)
                .map((_, j) => (i === j ? 0 : 1000)),
            );
          const durations = Array(n)
            .fill(0)
            .map((_, i) =>
              Array(n)
                .fill(0)
                .map((_, j) => (i === j ? 0 : 90)),
            );
          return {
            ok: true,
            json: async () => ({
              code: "Ok",
              distances,
              durations,
            }),
          };
        }
        return { ok: false, statusText: "Not Found" };
      }),
    );
  });

  afterAll(() => {
    clearRouteCache();
    vi.unstubAllGlobals();
  });

  describe("getRouteDistance", () => {
    it("should return distance and duration objects", async () => {
      // Using real coordinates for integration test
      const route = await getRouteDistance(3.5752, 98.6722, 3.584, 98.675);

      expect(route).toBeDefined();
      expect(route.distance).toBeGreaterThan(0);
      expect(route.duration).toBeGreaterThan(0);
      expect(typeof route.distance).toBe("number");
      expect(typeof route.duration).toBe("number");
    });

    it("should handle same coordinates (distance = 0)", async () => {
      const route = await getRouteDistance(3.5752, 98.6722, 3.5752, 98.6722);

      expect(route).toBeDefined();
      expect(route.distance).toBe(0);
      expect(route.duration).toBe(0);
    });

    it("should cache results after first call", async () => {
      clearRouteCache();
      const stats1 = getRouteCacheStats();
      expect(stats1.size).toBe(0);

      const route1 = await getRouteDistance(3.5752, 98.6722, 3.584, 98.675);
      const stats2 = getRouteCacheStats();
      expect(stats2.size).toBeGreaterThan(0);

      // Second call should return cached result
      const route2 = await getRouteDistance(3.5752, 98.6722, 3.584, 98.675);
      const stats3 = getRouteCacheStats();

      expect(route1.distance).toBe(route2.distance);
      expect(stats2.size).toBe(stats3.size); // Cache size shouldn't increase
    });

    it("should handle missing coordinates (fallback to haversine)", async () => {
      const route = await getRouteDistance(0, 0, 0, 0);

      expect(route).toBeDefined();
      expect(route.distance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getRouteMatrix", () => {
    it("should calculate matrix for multiple coordinates", async () => {
      const coordinates: [number, number][] = [
        [3.5752, 98.6722], // J1
        [3.584, 98.675], // J2
        [3.59, 98.68], // J3
      ];

      const matrix = await getRouteMatrix(coordinates);

      expect(matrix).toBeDefined();
      expect(matrix.distances).toHaveLength(3);
      expect(matrix.distances[0]).toHaveLength(3);
      expect(matrix.distances[0][0]).toBe(0); // Same point = 0 distance
      expect(matrix.distances[0][1]).toBeGreaterThan(0); // Different points = >0
      expect(matrix.distances[1][0]).toBeGreaterThan(0);
    });

    it("should be symmetric (distance A→B = distance B→A)", async () => {
      const coordinates: [number, number][] = [
        [3.5752, 98.6722],
        [3.584, 98.675],
      ];

      const matrix = await getRouteMatrix(coordinates);

      // In OSRM, driving distance is typically symmetric
      expect(
        Math.abs(matrix.distances[0][1] - matrix.distances[1][0]),
      ).toBeLessThan(100); // Allow 100m variation
    });

    it("should handle single coordinate", async () => {
      const coordinates: [number, number][] = [[3.5752, 98.6722]];

      const matrix = await getRouteMatrix(coordinates);

      expect(matrix.distances).toHaveLength(1);
      expect(matrix.distances[0]).toHaveLength(1);
      expect(matrix.distances[0][0]).toBe(0);
    });
  });

  describe("updateRayonDistances", () => {
    it("should update pickup points with routing data", async () => {
      const originalPoints: PickupPoint[] = [
        {
          code: "J1",
          name: "Test Point 1",
          time: "06:00",
          distanceToNext: 700,
          lat: 3.5752,
          lng: 98.6722,
        },
        {
          code: "J2",
          name: "Test Point 2",
          time: "06:05",
          distanceToNext: 950,
          lat: 3.584,
          lng: 98.675,
        },
        {
          code: "DEST",
          name: "Destination",
          time: "07:00",
          distanceToNext: 0,
          lat: 3.6422,
          lng: 98.8853,
        },
      ];

      const updated = await updateRayonDistances(originalPoints);

      expect(updated).toBeDefined();
      expect(updated).toHaveLength(originalPoints.length);

      // Check that routing fields were added
      expect(updated[0].routingDistance).toBeDefined();
      expect(updated[0].routingDuration).toBeDefined();
      expect(updated[0].routingUpdatedAt).toBeDefined();

      // Routing distance should be > 0 for non-DEST points
      expect(updated[0].routingDistance).toBeGreaterThan(0);
    });

    it("should preserve original distanceToNext", async () => {
      const originalPoints: PickupPoint[] = [
        {
          code: "J1",
          name: "Test",
          time: "06:00",
          distanceToNext: 700,
          lat: 3.5752,
          lng: 98.6722,
        },
      ];

      const updated = await updateRayonDistances(originalPoints);

      expect(updated[0].distanceToNext).toBe(originalPoints[0].distanceToNext);
    });

    it("should handle empty array", async () => {
      const updated = await updateRayonDistances([]);

      expect(updated).toBeDefined();
      expect(updated).toHaveLength(0);
    });
  });

  describe("caching behavior", () => {
    it("should clear cache", () => {
      clearRouteCache();
      const stats = getRouteCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.entries).toBe(0);
    });

    it("should return cache stats", () => {
      clearRouteCache();
      const stats = getRouteCacheStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("entries");
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.entries).toBe("number");
    });
  });
});
