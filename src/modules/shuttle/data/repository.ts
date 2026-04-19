/**
 * Repository — sync API on top of cloudStore (Supabase-backed in-memory cache).
 * Mutations fire-and-forget to Supabase but update local cache immediately
 * so existing sync UI keeps working.
 */
import {
  cloudCache,
  persistRayons,
  persistDepartTimes,
  persistServices,
  persistVehicles,
  persistDestination,
  persistContent,
  createBooking,
  setBookingStatus,
  removeBooking,
} from "./cloudStore";
import {
  type Rayon,
  type Destination,
  type ShuttleContent,
} from "./rayons";
import {
  type ServiceConfig,
  type VehicleType,
} from "./services";
import type { ShuttleBooking, BookingStatus } from "../types/booking";

// ---------- Rayons ----------
export function getRayons(): Rayon[] {
  return cloudCache.rayons;
}
export function saveRayons(rayons: Rayon[]) {
  cloudCache.rayons = rayons;
  void persistRayons(rayons);
}
export function getRayonById(id: string): Rayon | undefined {
  return cloudCache.rayons.find((r) => r.id.toUpperCase() === id.toUpperCase());
}

// ---------- Depart Times ----------
export function getDepartTimes(): string[] {
  return cloudCache.departTimes;
}
export function saveDepartTimes(times: string[]) {
  const sorted = [...new Set(times)].sort();
  cloudCache.departTimes = sorted;
  void persistDepartTimes(sorted);
}

// ---------- Services ----------
export function getServicesAll(): ServiceConfig[] {
  return cloudCache.services;
}
export function saveServices(services: ServiceConfig[]) {
  cloudCache.services = services;
  void persistServices(services);
}
export function getServiceByTier(tier: string): ServiceConfig | undefined {
  return cloudCache.services.find((s) => s.tier === tier);
}

// ---------- Vehicles ----------
export function getVehicleTypesAll(): VehicleType[] {
  return cloudCache.vehicles;
}
export function saveVehicleTypes(vehicles: VehicleType[]) {
  cloudCache.vehicles = vehicles;
  void persistVehicles(vehicles);
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
  b: Omit<ShuttleBooking, "id" | "createdAt" | "status"> & { status?: BookingStatus },
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
  createBooking(b).then((cloud) => {
    // Replace the local optimistic entry with the cloud one if codes differ
    cloudCache.bookings = [
      cloud,
      ...cloudCache.bookings.filter((x) => x.id !== localCode && x.id !== cloud.id),
    ];
  }).catch((err) => {
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
export function saveDestination(d: Destination) {
  cloudCache.destination = d;
  void persistDestination(d);
}
export function getContentStored(): ShuttleContent {
  return cloudCache.content;
}
export function saveContent(c: ShuttleContent) {
  cloudCache.content = c;
  void persistContent(c);
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
      saveRayons(DEFAULT_RAYONS);
      break;
    case "times":
      saveDepartTimes(DEFAULT_TIMES);
      break;
    case "services":
      saveServices(DEFAULT_SERVICES);
      break;
    case "vehicles":
      saveVehicleTypes(DEFAULT_VEHICLES);
      break;
    case "destination":
      saveDestination(DEFAULT_DESTINATION);
      break;
    case "content":
      saveContent(DEFAULT_CONTENT);
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
