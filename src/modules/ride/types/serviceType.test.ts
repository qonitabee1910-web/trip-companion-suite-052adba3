import { describe, it, expect } from "vitest";
import {
  getServiceType,
  getAllServiceTypes,
  userMeetsServiceRequirements,
  getPriceMultiplier,
  getBookingFee,
  calculateServiceTypeFare,
  SERVICE_TYPES,
  type ServiceTypeId,
} from "../types/serviceType";

describe("Service Types", () => {
  describe("SERVICE_TYPES configuration", () => {
    it("should have exactly 3 service types", () => {
      expect(Object.keys(SERVICE_TYPES)).toHaveLength(3);
    });

    it("should have standard, women, and car service types", () => {
      expect(SERVICE_TYPES).toHaveProperty("standard");
      expect(SERVICE_TYPES).toHaveProperty("women");
      expect(SERVICE_TYPES).toHaveProperty("car");
    });

    it("should have required properties for each service type", () => {
      Object.values(SERVICE_TYPES).forEach((service) => {
        expect(service).toHaveProperty("id");
        expect(service).toHaveProperty("name");
        expect(service).toHaveProperty("description");
        expect(service).toHaveProperty("longDescription");
        expect(service).toHaveProperty("icon");
        expect(service).toHaveProperty("color");
        expect(service).toHaveProperty("bgColor");
        expect(service).toHaveProperty("requirements");
        expect(service).toHaveProperty("pricing");
        expect(service).toHaveProperty("features");
        expect(service.features).toBeInstanceOf(Array);
        expect(service.features.length).toBeGreaterThan(0);
      });
    });

    it("standard service should have no gender restrictions", () => {
      expect(SERVICE_TYPES.standard.requirements.riderGender).toBe("any");
      expect(SERVICE_TYPES.standard.requirements.driverGender).toBe("any");
    });

    it("women service should restrict to female riders and drivers", () => {
      expect(SERVICE_TYPES.women.requirements.riderGender).toBe("female");
      expect(SERVICE_TYPES.women.requirements.driverGender).toBe("female");
    });

    it("car premium service should have highest rating requirement", () => {
      const carMinRating = SERVICE_TYPES.car.requirements.minRating || 0;
      const womenMinRating = SERVICE_TYPES.women.requirements.minRating || 0;
      const standardMinRating =
        SERVICE_TYPES.standard.requirements.minRating || 0;

      expect(carMinRating).toBeGreaterThanOrEqual(womenMinRating);
      expect(carMinRating).toBeGreaterThanOrEqual(standardMinRating);
    });
  });

  describe("getServiceType()", () => {
    it("should return correct service type for standard", () => {
      const service = getServiceType("standard");
      expect(service.id).toBe("standard");
      expect(service.name).toBe("Ride Standard");
    });

    it("should return correct service type for women", () => {
      const service = getServiceType("women");
      expect(service.id).toBe("women");
      expect(service.name).toBe("Ride Women");
    });

    it("should return correct service type for car", () => {
      const service = getServiceType("car");
      expect(service.id).toBe("car");
      expect(service.name).toBe("Ride Car Premium");
    });
  });

  describe("getAllServiceTypes()", () => {
    it("should return all 3 service types", () => {
      const types = getAllServiceTypes();
      expect(types).toHaveLength(3);
    });

    it("should return service types in consistent order", () => {
      const types = getAllServiceTypes();
      const ids = types.map((t) => t.id);
      expect(ids).toContain("standard");
      expect(ids).toContain("women");
      expect(ids).toContain("car");
    });
  });

  describe("userMeetsServiceRequirements()", () => {
    it("should allow female users for standard service", () => {
      const result = userMeetsServiceRequirements("standard", "female");
      expect(result.meets).toBe(true);
    });

    it("should allow male users for standard service", () => {
      const result = userMeetsServiceRequirements("standard", "male");
      expect(result.meets).toBe(true);
    });

    it("should allow female users for women service", () => {
      const result = userMeetsServiceRequirements("women", "female");
      expect(result.meets).toBe(true);
    });

    it("should reject male users for women service", () => {
      const result = userMeetsServiceRequirements("women", "male");
      expect(result.meets).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("wanita");
    });

    it("should reject other gender for women service", () => {
      const result = userMeetsServiceRequirements("women", "other");
      expect(result.meets).toBe(false);
    });

    it("should allow any gender for car service", () => {
      const femaleResult = userMeetsServiceRequirements("car", "female");
      const maleResult = userMeetsServiceRequirements("car", "male");
      expect(femaleResult.meets).toBe(true);
      expect(maleResult.meets).toBe(true);
    });
  });

  describe("getPriceMultiplier()", () => {
    it("should return 1.0 for standard service", () => {
      expect(getPriceMultiplier("standard")).toBe(1.0);
    });

    it("should return 1.1 for women service", () => {
      expect(getPriceMultiplier("women")).toBe(1.1);
    });

    it("should return 1.25 for car service", () => {
      expect(getPriceMultiplier("car")).toBe(1.25);
    });

    it("should have increasing multipliers: standard < women < car", () => {
      const standard = getPriceMultiplier("standard");
      const women = getPriceMultiplier("women");
      const car = getPriceMultiplier("car");

      expect(standard).toBeLessThan(women);
      expect(women).toBeLessThan(car);
    });
  });

  describe("getBookingFee()", () => {
    it("should return 0 for standard service", () => {
      expect(getBookingFee("standard")).toBe(0);
    });

    it("should return 2500 for women service", () => {
      expect(getBookingFee("women")).toBe(2500);
    });

    it("should return 5000 for car service", () => {
      expect(getBookingFee("car")).toBe(5000);
    });

    it("should have increasing fees: standard < women < car", () => {
      const standard = getBookingFee("standard");
      const women = getBookingFee("women");
      const car = getBookingFee("car");

      expect(standard).toBeLessThan(women);
      expect(women).toBeLessThan(car);
    });
  });

  describe("calculateServiceTypeFare()", () => {
    const basePrice = 10000; // Rp 10,000
    const pricePerKm = 5000; // Rp 5,000 per km
    const distanceKm = 2;

    it("should calculate correct fare for standard service", () => {
      const result = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "standard",
      );

      expect(result.baseFare).toBe(basePrice + pricePerKm * distanceKm); // 20,000
      expect(result.multiplier).toBe(1.0);
      expect(result.bookingFee).toBe(0);
      expect(result.totalFare).toBe(20000);
    });

    it("should calculate correct fare for women service", () => {
      const result = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "women",
      );

      const baseFare = basePrice + pricePerKm * distanceKm; // 20,000
      const expectedFare = Math.round(baseFare * 1.1) + 2500; // 22,000 + 2,500 = 24,500

      expect(result.baseFare).toBe(baseFare);
      expect(result.multiplier).toBe(1.1);
      expect(result.bookingFee).toBe(2500);
      expect(result.totalFare).toBe(expectedFare);
    });

    it("should calculate correct fare for car service", () => {
      const result = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "car",
      );

      const baseFare = basePrice + pricePerKm * distanceKm; // 20,000
      const expectedFare = Math.round(baseFare * 1.25) + 5000; // 25,000 + 5,000 = 30,000

      expect(result.baseFare).toBe(baseFare);
      expect(result.multiplier).toBe(1.25);
      expect(result.bookingFee).toBe(5000);
      expect(result.totalFare).toBe(expectedFare);
    });

    it("women service should cost more than standard for same route", () => {
      const standard = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "standard",
      );
      const women = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "women",
      );

      expect(women.totalFare).toBeGreaterThan(standard.totalFare);
    });

    it("car service should cost more than women service for same route", () => {
      const women = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "women",
      );
      const car = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "car",
      );

      expect(car.totalFare).toBeGreaterThan(women.totalFare);
    });

    it("should round total fare to nearest integer", () => {
      const result = calculateServiceTypeFare(10000, 3333.33, 1, "women");
      expect(result.totalFare).toEqual(Math.round(result.totalFare));
      expect(Number.isInteger(result.totalFare)).toBe(true);
    });

    it("should handle different distances correctly", () => {
      const dist1 = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        1,
        "standard",
      );
      const dist5 = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        5,
        "standard",
      );

      expect(dist5.totalFare).toBeGreaterThan(dist1.totalFare);
      expect(dist5.totalFare - dist1.totalFare).toBe((5 - 1) * pricePerKm);
    });

    it("should include booking fee in total fare", () => {
      const standard = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "standard",
      );
      const women = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distanceKm,
        "women",
      );

      const feeDifference = women.totalFare - standard.totalFare;
      expect(feeDifference).toBeGreaterThanOrEqual(2500); // At least booking fee
    });
  });

  describe("Pricing strategies", () => {
    it("standard service should have lowest total cost", () => {
      const basePrice = 15000;
      const pricePerKm = 4000;
      const distance = 3;

      const standard = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distance,
        "standard",
      ).totalFare;
      const women = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distance,
        "women",
      ).totalFare;
      const car = calculateServiceTypeFare(
        basePrice,
        pricePerKm,
        distance,
        "car",
      ).totalFare;

      expect(standard).toBeLessThanOrEqual(women);
      expect(women).toBeLessThanOrEqual(car);
    });

    it("should scale pricing correctly with distance", () => {
      const basePrice = 10000;
      const pricePerKm = 5000;

      for (let distance = 1; distance <= 10; distance++) {
        const result = calculateServiceTypeFare(
          basePrice,
          pricePerKm,
          distance,
          "standard",
        );
        const expected = basePrice + pricePerKm * distance;
        expect(result.totalFare).toBe(expected);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle zero distance", () => {
      const result = calculateServiceTypeFare(10000, 5000, 0, "standard");
      expect(result.totalFare).toBe(10000);
    });

    it("should handle very small distances", () => {
      const result = calculateServiceTypeFare(10000, 5000, 0.1, "women");
      expect(result.totalFare).toBeGreaterThan(0);
      expect(Number.isFinite(result.totalFare)).toBe(true);
    });

    it("should handle very large distances", () => {
      const result = calculateServiceTypeFare(10000, 5000, 100, "car");
      expect(result.totalFare).toBeGreaterThan(0);
      expect(Number.isFinite(result.totalFare)).toBe(true);
    });

    it("should handle zero base price", () => {
      const result = calculateServiceTypeFare(0, 5000, 5, "standard");
      expect(result.totalFare).toBe(25000);
    });
  });
});
