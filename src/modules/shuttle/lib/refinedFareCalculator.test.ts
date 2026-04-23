import { describe, it, expect, vi, beforeEach } from "vitest";
import { calcEnhancedFareBreakdown } from "./refinedFareCalculator";
import type { VehicleType, ServiceConfig, FareSettings } from "../data/services";
import type { RefinedRayon } from "./refinedFareCalculator";

// Mock repository
const mockFareSettings: FareSettings = {
  calculationMethod: "distance_based",
  minFare: 50000,
  maxDistanceKm: 500,
  enableLogging: true,
};

vi.mock("../data/repository", () => ({
  getFareSettingsStored: () => mockFareSettings,
}));

// Mock OSRM helpers
vi.mock("./osrmRouting", () => ({
  getRouteDistance: vi.fn(),
  getRouteMatrix: vi.fn(),
  getSimpleDistance: vi.fn(),
}));

describe("calcEnhancedFareBreakdown", () => {
  const mockVehicle: VehicleType = {
    id: "hiace",
    label: "Toyota Hiace",
    vehicleName: "Hiace",
    description: "Spacious",
    basePrice: 20000,
    tierPrices: {
      reguler: 20000,
      executive: 50000,
    },
  };

  const mockService: ServiceConfig = {
    tier: "reguler",
    label: "Reguler",
    description: "Economy",
    farePerKm: 1500,
    features: [],
  };

  const mockRayon: RefinedRayon = {
    id: "A",
    name: "Rayon A",
    area: "Medan",
    color: "primary",
    estimateMin: 60,
    surcharge: 10000,
    farePerKm: 1500,
    pickupPoints: [
      { code: "P1", name: "Point 1", time: "08:00", distanceToNext: 10000, lat: 1, lng: 1 },
      { code: "DEST", name: "Dest", time: "09:00", distanceToNext: 0, lat: 2, lng: 2 },
    ],
  };

  beforeEach(() => {
    mockFareSettings.calculationMethod = "distance_based";
    mockFareSettings.minFare = 50000;
  });

  it("calculates distance-based fare correctly", async () => {
    // Distance 10km * 1500 = 15000
    // Base price = 20000
    // Surcharge = 10000
    // Total = 45000 -> Round to 45000 -> Min fare 50000 applied
    const result = await calcEnhancedFareBreakdown(mockVehicle, mockService, mockRayon, "P1", false);
    expect(result.total).toBe(50000);
    expect(result.auditTrail.isMinimumFareApplied).toBe(true);
  });

  it("calculates distance-based fare without min fare when total is high", async () => {
    const longRayon = {
      ...mockRayon,
      pickupPoints: [
        { code: "P1", name: "Point 1", time: "08:00", distanceToNext: 50000, lat: 1, lng: 1 },
        { code: "DEST", name: "Dest", time: "09:00", distanceToNext: 0, lat: 2, lng: 2 },
      ],
    };
    // Distance 50km * 1500 = 75000
    // Base price = 20000
    // Surcharge = 10000
    // Total = 105000
    const result = await calcEnhancedFareBreakdown(mockVehicle, mockService, longRayon, "P1", false);
    expect(result.total).toBe(105000);
    expect(result.auditTrail.isMinimumFareApplied).toBe(false);
  });

  it("uses tier-based calculation method correctly", async () => {
    mockFareSettings.calculationMethod = "tier_based";
    // Distance fare ignored
    // Base price = 20000
    // Surcharge = 10000
    // Total = 30000 -> Min fare 50000 applied
    const result = await calcEnhancedFareBreakdown(mockVehicle, mockService, mockRayon, "P1", false);
    expect(result.total).toBe(50000);
  });

  it("uses fixed calculation method correctly", async () => {
    mockFareSettings.calculationMethod = "fixed";
    const result = await calcEnhancedFareBreakdown(mockVehicle, mockService, mockRayon, "P1", false);
    expect(result.total).toBe(100000);
  });

  it("caps distance at maximum allowed", async () => {
    const veryLongRayon = {
      ...mockRayon,
      pickupPoints: [
        { code: "P1", name: "Point 1", time: "08:00", distanceToNext: 600000, lat: 1, lng: 1 },
        { code: "DEST", name: "Dest", time: "09:00", distanceToNext: 0, lat: 2, lng: 2 },
      ],
    };
    // Distance 600km -> capped at 500km
    const result = await calcEnhancedFareBreakdown(mockVehicle, mockService, veryLongRayon, "P1", false);
    expect(result.distanceKm).toBe(500);
    expect(result.auditTrail.isMaxDistanceExceeded).toBe(true);
  });
});
