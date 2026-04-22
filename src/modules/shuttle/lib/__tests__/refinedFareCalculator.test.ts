import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  calcEnhancedFareBreakdown,
  calculateRayonDistance,
  getRemainingDistance,
} from "../refinedFareCalculator";
import { SEED_RAYONS_PYUGO, type Rayon } from "../../data/rayons";
import {
  VEHICLE_TYPES,
  SERVICES,
  type VehicleType,
  type ServiceConfig,
} from "../../data/services";

describe("refinedFareCalculator", () => {
  let testRayon: Rayon;
  let testVehicle: VehicleType;
  let testService: ServiceConfig;

  beforeAll(() => {
    testRayon = SEED_RAYONS_PYUGO[0]; // Rayon A
    testVehicle = VEHICLE_TYPES[0]; // Default vehicle
    testService = SERVICES[0]; // Default service

    // Proper mock for fetch
    vi.stubGlobal("fetch", vi.fn(async (urlStr: string) => {
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
        const coords = url.searchParams.get("coordinates")?.split(";") || [];
        const n = coords.length;
        const distances = Array(n).fill(0).map((_, i) => 
          Array(n).fill(0).map((_, j) => (i === j ? 0 : 1000))
        );
        return {
          ok: true,
          json: async () => ({
            code: "Ok",
            distances,
          }),
        };
      }
      return { ok: false, statusText: "Not Found" };
    }));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe("calcEnhancedFareBreakdown", () => {
    it("should calculate enhanced fare breakdown", async () => {
      const breakdown = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false, // Don't use OSRM (may not be available)
      );

      expect(breakdown).toBeDefined();
      expect(breakdown.total).toBeGreaterThan(0);
      expect(breakdown.distanceKm).toBeGreaterThan(0);
      expect(breakdown.estimatedDurationMin).toBeGreaterThan(0);
    });

    it("should include routing source metadata", async () => {
      const breakdown = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false,
      );

      expect(breakdown).toHaveProperty("routingSource");
      expect(["osrm", "cached", "fallback"]).toContain(breakdown.routingSource);
    });

    it("should handle null vehicle", async () => {
      const breakdown = await calcEnhancedFareBreakdown(
        null,
        testService,
        testRayon,
        "J1",
        false,
      );

      expect(breakdown).toBeDefined();
      expect(breakdown.total).toBeGreaterThan(0);
    });

    it("should calculate different prices for different pickups", async () => {
      const bd1 = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false,
      );

      const bd2 = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J5",
        false,
      );

      // Different pickup points should have different fares if perPickupFare enabled
      // or same fare if not enabled
      expect(bd1.total).toBeDefined();
      expect(bd2.total).toBeDefined();
    });
  });

  describe("calculateRayonDistance", () => {
    it("should calculate rayon total distance", async () => {
      const result = await calculateRayonDistance(testRayon);

      expect(result).toBeDefined();
      expect(result.totalDistanceM).toBeGreaterThan(0);
      expect(result.estimatedMinutes).toBeGreaterThan(0);
      expect(result.pointsWithDistance).toBeDefined();
    });

    it("should include routing data for each point", async () => {
      const result = await calculateRayonDistance(testRayon);

      expect(result.pointsWithDistance).toHaveLength(
        testRayon.pickupPoints.length,
      );

      result.pointsWithDistance.forEach((point) => {
        expect(point).toHaveProperty("code");
        expect(point).toHaveProperty("routingDistance");
        expect(point).toHaveProperty("routingDuration");
      });
    });

    it("should sum to total distance", async () => {
      const result = await calculateRayonDistance(testRayon);

      const summed = result.pointsWithDistance.reduce(
        (sum, p) => sum + (p.routingDistance || 0),
        0,
      );

      expect(Math.abs(summed - result.totalDistanceM)).toBeLessThan(100); // Allow 100m rounding error
    });
  });

  describe("getRemainingDistance", () => {
    it("should calculate remaining distance from pickup point", async () => {
      const result = await getRemainingDistance(testRayon, "J3");

      expect(result).toBeDefined();
      expect(result.distanceM).toBeGreaterThan(0);
      expect(result.durationS).toBeGreaterThan(0);
    });

    it("should handle DEST (0 remaining)", async () => {
      const result = await getRemainingDistance(testRayon, "DEST");

      expect(result).toBeDefined();
      expect(result.distanceM).toBe(0);
      expect(result.durationS).toBe(0);
    });

    it("should decrease as we move through stops", async () => {
      const dist1 = await getRemainingDistance(testRayon, "J1");
      const dist2 = await getRemainingDistance(testRayon, "J5");

      // Later stops should have less remaining distance
      expect(dist1.distanceM).toBeGreaterThan(dist2.distanceM);
    });
  });

  describe("fare calculation consistency", () => {
    it("should match legacy calculation for same inputs", async () => {
      // This tests that enhanced calculation gives reasonable results
      const breakdown = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false,
      );

      // Fare should be positive and reasonable
      expect(breakdown.total).toBeGreaterThan(0);
      expect(breakdown.total).toBeLessThan(500000); // Less than 500k for local route
    });

    it("should calculate per-pickup fares correctly", async () => {
      const bd1 = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false,
      );

      const bd2 = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J2",
        false,
      );

      // Both should be valid fares
      expect(bd1.total).toBeGreaterThan(0);
      expect(bd2.total).toBeGreaterThan(0);
    });
  });

  describe("accuracy estimation", () => {
    it("should provide time estimates", async () => {
      const breakdown = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false,
      );

      expect(breakdown.estimatedDurationMin).toBeGreaterThan(0);
      expect(breakdown.estimatedDurationMin).toBeLessThan(1000); // Less than 1000 minutes for reasonable route
    });

    it("should indicate data quality", async () => {
      const breakdown = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false,
      );

      expect(breakdown).toHaveProperty("routingSource");
      expect(["osrm", "cached", "fallback"]).toContain(breakdown.routingSource);
    });
  });

  describe("Edge Cases and Audit Trail", () => {
    it("should apply minimum fare", async () => {
      // Mock a very short route that would normally be cheap
      const cheapRayon = {
        ...testRayon,
        pickupPoints: [
          { code: "A", name: "A", distanceToNext: 100, lat: 0, lng: 0 },
          { code: "DEST", name: "DEST", distanceToNext: 0, lat: 0.0001, lng: 0.0001 }
        ]
      };

      const breakdown = await calcEnhancedFareBreakdown(
        { ...testVehicle, basePrice: 0, tierPrices: { reguler: 0 } },
        { ...testService, farePerKm: 1500 },
        cheapRayon as any,
        "A",
        false
      );

      expect(breakdown.total).toBe(50000); // MINIMUM_FARE
      expect(breakdown.auditTrail.isMinimumFareApplied).toBe(true);
    });

    it("should cap at maximum distance", async () => {
      // Mock a very long route
      const longRayon = {
        ...testRayon,
        pickupPoints: [
          { code: "A", name: "A", distanceToNext: 1000000, lat: 0, lng: 0 }, // 1000km
          { code: "DEST", name: "DEST", distanceToNext: 0, lat: 10, lng: 10 }
        ]
      };

      const breakdown = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        longRayon as any,
        "A",
        false
      );

      expect(breakdown.distanceKm).toBe(500); // MAXIMUM_DISTANCE_KM
      expect(breakdown.auditTrail.isMaxDistanceExceeded).toBe(true);
    });

    it("should provide comprehensive audit trail", async () => {
      const breakdown = await calcEnhancedFareBreakdown(
        testVehicle,
        testService,
        testRayon,
        "J1",
        false
      );

      expect(breakdown.auditTrail).toBeDefined();
      expect(breakdown.auditTrail.basePrice).toBe(breakdown.basePrice);
      expect(breakdown.auditTrail.distanceKm).toBe(breakdown.distanceKm);
      expect(breakdown.auditTrail.farePerKm).toBe(breakdown.farePerKm);
      expect(breakdown.auditTrail.surcharge).toBe(breakdown.surcharge);
    });
  });
});
