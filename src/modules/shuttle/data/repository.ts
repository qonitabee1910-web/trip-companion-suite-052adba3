/**
 * Repository — sync API on top of cloudStore (Supabase-backed in-memory cache).
 * Mutations fire-and-forget to Supabase but update local cache immediately
 * so existing sync UI keeps working.
 */
import {
  cloudCache,
  notifyStore,
  persistRayons,
  persistDepartTimes,
  persistServices,
  persistVehicles,
  persistDestination,
  persistContent,
  createBooking,
  setBookingStatus,
  removeBooking,
  getVehicleTierMappings,
  isVehicleAllowedForTier,
  getVehiclesForTier,
  persistVehicleTierMappings,
  logVehicleAccess,
  getVehicleAccessLogs,
  purgeOldAccessLogs,
  persistFareSettings,
  logShuttleActivity,
  getShuttleActivityLogs,
} from "./cloudStore";
import { type Rayon, type Destination, type ShuttleContent } from "./rayons";
import {
  type ServiceConfig,
  type VehicleType,
  type ServiceTier,
  type VehicleTypeId,
  type VehicleTierMapping,
  type VehicleAccessLog,
  type FareSettings,
  type ShuttleActivityLog,
} from "./services";
import type { ShuttleBooking, BookingStatus } from "../types/booking";

// ---------- Generic Save Result ----------
export interface SaveResult {
  ok: boolean;
  error?: { code?: string; message: string };
}

// ---------- Rayons ----------
export function getRayons(): Rayon[] {
  return cloudCache.rayons;
}
export function getRayonsActive(): Rayon[] {
  return cloudCache.rayons.filter((r) => r.active !== false);
}
export async function saveRayons(rayons: Rayon[]): Promise<SaveResult> {
  const previous = cloudCache.rayons;
  // Optimistic update so subscribers see the change immediately
  cloudCache.rayons = rayons;
  notifyStore();
  const res = await persistRayons(rayons);
  if (!res.ok) {
    cloudCache.rayons = previous;
    notifyStore();
  }
  return res;
}
export function getRayonById(id: string): Rayon | undefined {
  return cloudCache.rayons.find((r) => r.id.toUpperCase() === id.toUpperCase());
}

// ---------- Depart Times ----------
export function getDepartTimes(): string[] {
  return cloudCache.departTimes;
}

export type SaveDepartTimesResult = SaveResult;

export async function saveDepartTimes(times: string[]): Promise<SaveResult> {
  const previous = cloudCache.departTimes;
  const sorted = [...new Set(times)].sort();
  cloudCache.departTimes = sorted;
  notifyStore();
  const res = await persistDepartTimes(sorted);
  if (!res.ok) {
    cloudCache.departTimes = previous;
    notifyStore();
  }
  return res;
}

// ---------- Services ----------
export function getServicesAll(): ServiceConfig[] {
  return cloudCache.services;
}
export async function saveServices(
  services: ServiceConfig[],
): Promise<SaveResult> {
  const previous = cloudCache.services;
  cloudCache.services = services;
  notifyStore();
  const res = await persistServices(services);
  if (!res.ok) {
    cloudCache.services = previous;
    notifyStore();
  }
  return res;
}
export function getServiceByTier(tier: string): ServiceConfig | undefined {
  return cloudCache.services.find((s) => s.tier === tier);
}

// ---------- Vehicles ----------
export function getVehicleTypesAll(): VehicleType[] {
  return cloudCache.vehicles;
}
export async function saveVehicleTypes(
  vehicles: VehicleType[],
): Promise<SaveResult> {
  const previous = cloudCache.vehicles;

  // Activity logging for status changes
  vehicles.forEach((v) => {
    const prev = previous.find((p) => p.id === v.id);
    if (prev && prev.active !== v.active) {
      console.log(
        `[audit] Vehicle ${v.id} status changed: ${prev.active ? "ACTIVE" : "INACTIVE"} -> ${v.active ? "ACTIVE" : "INACTIVE"} at ${new Date().toISOString()}`,
      );
      // In a real app, persist this log to a database table
    }
  });

  cloudCache.vehicles = vehicles;
  notifyStore();
  const res = await persistVehicles(vehicles);
  if (!res.ok) {
    cloudCache.vehicles = previous;
    notifyStore();
  }
  return res;
}
export function getVehicleTypeById(id: string): VehicleType | undefined {
  return cloudCache.vehicles.find((v) => v.id === id);
}

// ---------- Bookings ----------
export function getBookings(): ShuttleBooking[] {
  return cloudCache.bookings;
}

/**
 * Sync wrapper: optimistically returns a local booking, persists in background.
 * Cloud insert eventually replaces the local code via realtime sync.
 */
export function addBooking(
  b: Omit<ShuttleBooking, "id" | "createdAt" | "status"> & {
    status?: BookingStatus;
  },
): ShuttleBooking {
  const localCode = `TRV-S${Date.now().toString().slice(-7)}`;
  const localBooking: ShuttleBooking = {
    ...b,
    id: localCode,
    createdAt: new Date().toISOString(),
    status: b.status ?? "confirmed",
  };
  cloudCache.bookings = [localBooking, ...cloudCache.bookings];
  // Persist async; on success the realtime channel + insert response will reconcile
  createBooking(b)
    .then((cloud) => {
      // Replace the local optimistic entry with the cloud one if codes differ
      cloudCache.bookings = [
        cloud,
        ...cloudCache.bookings.filter(
          (x) => x.id !== localCode && x.id !== cloud.id,
        ),
      ];
    })
    .catch((err) => {
      console.error("[repository] booking persist failed:", err);
    });
  return localBooking;
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  cloudCache.bookings = cloudCache.bookings.map((b) =>
    b.id === id ? { ...b, status } : b,
  );
  void setBookingStatus(id, status);
}

export function deleteBooking(id: string) {
  cloudCache.bookings = cloudCache.bookings.filter((b) => b.id !== id);
  void removeBooking(id);
}

// ---------- Destination & Content ----------
export function getDestinationStored(): Destination {
  return cloudCache.destination;
}
export async function saveDestination(d: Destination): Promise<SaveResult> {
  const previous = cloudCache.destination;
  cloudCache.destination = d;
  notifyStore();
  const res = await persistDestination(d);
  if (!res.ok) {
    cloudCache.destination = previous;
    notifyStore();
  }
  return res;
}
export function getContentStored(): ShuttleContent {
  return cloudCache.content;
}
export async function saveContent(c: ShuttleContent): Promise<SaveResult> {
  const previous = cloudCache.content;
  cloudCache.content = c;
  notifyStore();
  const res = await persistContent(c);
  if (!res.ok) {
    cloudCache.content = previous;
    notifyStore();
  }
  return res;
}

// ---------- Fare Settings ----------
export function getFareSettingsStored(): FareSettings {
  return cloudCache.fareSettings;
}

export async function saveFareSettings(
  settings: FareSettings,
): Promise<SaveResult> {
  const previous = cloudCache.fareSettings;

  // Log activity if enabled
  if (settings.enableLogging) {
    void logShuttleActivity("update_fare_settings", {
      before: previous,
      after: settings,
    });
  }

  cloudCache.fareSettings = settings;
  notifyStore();

  const res = await persistFareSettings(settings);
  if (!res.ok) {
    cloudCache.fareSettings = previous;
    notifyStore();
  }
  return res;
}

export async function getActivityLogs(
  limit: number = 50,
  offset: number = 0,
): Promise<ShuttleActivityLog[]> {
  return getShuttleActivityLogs(limit, offset);
}

// ---------- Reset (re-seed defaults locally + push) ----------
export type ResettableSection =
  | "rayons"
  | "times"
  | "services"
  | "vehicles"
  | "bookings"
  | "destination"
  | "content"
  | "inventory";

import {
  RAYONS as DEFAULT_RAYONS,
  DEPART_TIMES as DEFAULT_TIMES,
  DEFAULT_DESTINATION,
  DEFAULT_CONTENT,
} from "./rayons";
import {
  SERVICES as DEFAULT_SERVICES,
  VEHICLE_TYPES as DEFAULT_VEHICLES,
} from "./services";

export function resetSection(section: ResettableSection) {
  switch (section) {
    case "rayons":
      void saveRayons(DEFAULT_RAYONS);
      break;
    case "times":
      void saveDepartTimes(DEFAULT_TIMES);
      break;
    case "services":
      void saveServices(DEFAULT_SERVICES);
      break;
    case "vehicles":
      void saveVehicleTypes(DEFAULT_VEHICLES);
      break;
    case "destination":
      void saveDestination(DEFAULT_DESTINATION);
      break;
    case "content":
      void saveContent(DEFAULT_CONTENT);
      break;
    case "bookings":
      // delete all current bookings client-side, fire deletes
      cloudCache.bookings.forEach((b) => void removeBooking(b.id));
      cloudCache.bookings = [];
      break;
    case "inventory":
      // no-op for now (admin manages via slot UI)
      break;
  }
}

export function resetAll() {
  resetSection("rayons");
  resetSection("times");
  resetSection("services");
  resetSection("vehicles");
  resetSection("destination");
  resetSection("content");
}

// ---------- Vehicle Tier Access Control ----------

/**
 * Get all vehicle tier mappings for admin management.
 */
export function getVehicleTierAccessMappings(): VehicleTierMapping[] {
  return getVehicleTierMappings();
}

/**
 * Check if a vehicle is allowed for a specific tier.
 * Used by booking flow to validate customer's vehicle selection.
 */
export function isVehicleAllowed(
  vehicleId: VehicleTypeId,
  tier: ServiceTier,
): boolean {
  return isVehicleAllowedForTier(vehicleId, tier);
}

/**
 * Get filtered list of vehicles available for a specific tier.
 * Only returns active vehicles that are allowed for this tier.
 */
export function getAvailableVehiclesForTier(tier: ServiceTier): VehicleType[] {
  return getVehiclesForTier(tier);
}

/**
 * Update vehicle tier mappings from admin.
 * Fire-and-forget: updates cache immediately, persists async.
 */
export async function saveVehicleTierMappings(
  mappings: VehicleTierMapping[],
): Promise<SaveResult> {
  const previous = cloudCache.vehicleTierMappings;
  cloudCache.vehicleTierMappings = mappings;
  notifyStore();

  const res = await persistVehicleTierMappings(mappings);
  if (!res.ok) {
    cloudCache.vehicleTierMappings = previous;
    notifyStore();
  }
  return res;
}

// ---------- Vehicle Access Logging ----------

/**
 * Log a vehicle access attempt (view, book, or bypass).
 * Fire-and-forget: doesn't block UI.
 */
export async function logVehicleAccessAttempt(
  vehicleId: VehicleTypeId,
  tier: ServiceTier,
  action: "view" | "book" | "bypass_attempt",
  result: "allowed" | "blocked" | "not_configured",
  reason?: string,
): Promise<void> {
  await logVehicleAccess(vehicleId, tier, action, result, reason);
}

/**
 * Get vehicle access logs for admin dashboard.
 * Paginated with optional filters.
 */
export async function getAccessLogs(options?: {
  vehicleId?: VehicleTypeId;
  tier?: ServiceTier;
  result?: "allowed" | "blocked" | "not_configured";
  limit?: number;
  offset?: number;
}): Promise<VehicleAccessLog[]> {
  return getVehicleAccessLogs(options);
}

/**
 * Purge old vehicle access logs (default: >90 days).
 * Admin-only operation.
 */
export async function purgeAccessLogs(
  daysOld: number = 90,
): Promise<SaveResult> {
  return purgeOldAccessLogs(daysOld);
}
