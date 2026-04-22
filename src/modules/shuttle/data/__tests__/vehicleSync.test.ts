import { describe, it, expect, vi } from "vitest";
import { getVehicleTypesAll, saveVehicleTypes } from "../repository";
import { cloudCache, notifyStore } from "../cloudStore";
import type { VehicleType } from "../services";

describe("Vehicle Status Synchronization", () => {
  it("should filter out inactive vehicles from user view", async () => {
    // Mock vehicles
    const mockVehicles: VehicleType[] = [
      { id: "hiace", label: "HiAce", vehicleName: "H1", description: "Desc", active: true },
      { id: "suv", label: "SUV", vehicleName: "S1", description: "Desc", active: false },
    ];

    // Simulate saving to repository
    cloudCache.vehicles = mockVehicles;
    notifyStore();

    const activeVehicles = getVehicleTypesAll().filter(v => v.active !== false);
    
    expect(activeVehicles.length).toBe(1);
    expect(activeVehicles[0].id).toBe("hiace");
  });

  it("should log status changes in audit trail", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    
    const initialVehicles: VehicleType[] = [
      { id: "hiace", label: "HiAce", vehicleName: "H1", description: "Desc", active: true }
    ];
    cloudCache.vehicles = initialVehicles;

    const updatedVehicles: VehicleType[] = [
      { id: "hiace", label: "HiAce", vehicleName: "H1", description: "Desc", active: false }
    ];

    await saveVehicleTypes(updatedVehicles);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[audit] Vehicle hiace status changed: ACTIVE -> INACTIVE"));
    
    consoleSpy.mockRestore();
  });
});
