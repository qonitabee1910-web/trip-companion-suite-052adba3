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

// ---------- Generic Save Result ----------
export interface SaveResult {
  ok: boolean;
  error?: { code?: string; message: string };
}

// ---------- Rayons ----------
export function getRayons(): Rayon[] {
  return cloudCache.rayons;
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
export async function saveServices(services: ServiceConfig[]): Promise<SaveResult> {
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
export async function saveVehicleTypes(vehicles: VehicleType[]): Promise<SaveResult> {
  const previous = cloudCache.vehicles;
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
export async function saveDestination(d: Destination): Promise<SaveResult> {
  const previous = cloudCache.destination;
  cloudCache.destination = d;
  const res = await persistDestination(d);
  if (!res.ok) {
    cloudCache.destination = previous;
  }
  return res;
}
export function getContentStored(): ShuttleContent {
  return cloudCache.content;
}
export async function saveContent(c: ShuttleContent): Promise<SaveResult> {
  const previous = cloudCache.content;
  cloudCache.content = c;
  const res = await persistContent(c);
  if (!res.ok) {
    cloudCache.content = previous;
  }
  return res;
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
