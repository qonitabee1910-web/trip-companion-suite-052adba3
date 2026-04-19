import {
  RAYONS as DEFAULT_RAYONS,
  DEPART_TIMES as DEFAULT_TIMES,
  DEFAULT_DESTINATION,
  DEFAULT_CONTENT,
  migrateRayon,
  type Rayon,
  type Destination,
  type ShuttleContent,
} from "./rayons";
import {
  SERVICES as DEFAULT_SERVICES,
  VEHICLE_TYPES as DEFAULT_VEHICLES,
  type ServiceConfig,
  type VehicleType,
} from "./services";
import type { ShuttleBooking, BookingStatus } from "../types/booking";

const KEY = {
  rayons: "shuttle-admin:rayons",
  times: "shuttle-admin:depart-times",
  services: "shuttle-admin:services",
  vehicles: "shuttle-admin:vehicles",
  bookings: "shuttle-admin:bookings",
  destination: "shuttle-admin:destination",
  content: "shuttle-admin:content",
  inventory: "shuttle-admin:inventory",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Rayons ----------
export function getRayons(): Rayon[] {
  const raw = read<unknown[]>(KEY.rayons, DEFAULT_RAYONS as unknown as unknown[]);
  return (raw as Parameters<typeof migrateRayon>[0][]).map(migrateRayon);
}
export function saveRayons(rayons: Rayon[]) {
  write(KEY.rayons, rayons);
}
export function getRayonById(id: string): Rayon | undefined {
  return getRayons().find((r) => r.id === id.toUpperCase());
}

// ---------- Depart Times ----------
export function getDepartTimes(): string[] {
  return read<string[]>(KEY.times, DEFAULT_TIMES);
}
export function saveDepartTimes(times: string[]) {
  write(KEY.times, times);
}

// ---------- Services ----------
export function getServicesAll(): ServiceConfig[] {
  return read<ServiceConfig[]>(KEY.services, DEFAULT_SERVICES);
}
export function saveServices(services: ServiceConfig[]) {
  write(KEY.services, services);
}
export function getServiceByTier(tier: string): ServiceConfig | undefined {
  return getServicesAll().find((s) => s.tier === tier);
}

// ---------- Vehicles ----------
export function getVehicleTypesAll(): VehicleType[] {
  return read<VehicleType[]>(KEY.vehicles, DEFAULT_VEHICLES);
}
export function saveVehicleTypes(vehicles: VehicleType[]) {
  write(KEY.vehicles, vehicles);
}
export function getVehicleTypeById(id: string): VehicleType | undefined {
  return getVehicleTypesAll().find((v) => v.id === id);
}

// ---------- Bookings ----------
export function getBookings(): ShuttleBooking[] {
  return read<ShuttleBooking[]>(KEY.bookings, []);
}
export function addBooking(b: Omit<ShuttleBooking, "id" | "createdAt" | "status"> & { status?: BookingStatus }): ShuttleBooking {
  const all = getBookings();
  const booking: ShuttleBooking = {
    ...b,
    id: `TRV-S${Date.now().toString().slice(-7)}`,
    createdAt: new Date().toISOString(),
    status: b.status ?? "confirmed",
  };
  write(KEY.bookings, [booking, ...all]);
  return booking;
}
export function updateBookingStatus(id: string, status: BookingStatus) {
  const all = getBookings().map((b) => (b.id === id ? { ...b, status } : b));
  write(KEY.bookings, all);
}
export function deleteBooking(id: string) {
  write(KEY.bookings, getBookings().filter((b) => b.id !== id));
}

// ---------- Destination & Content ----------
export function getDestinationStored(): Destination {
  return read<Destination>(KEY.destination, DEFAULT_DESTINATION);
}
export function saveDestination(d: Destination) {
  write(KEY.destination, d);
}
export function getContentStored(): ShuttleContent {
  return read<ShuttleContent>(KEY.content, DEFAULT_CONTENT);
}
export function saveContent(c: ShuttleContent) {
  write(KEY.content, c);
}

// ---------- Reset ----------
export function resetAll() {
  if (typeof window === "undefined") return;
  Object.values(KEY).forEach((k) => localStorage.removeItem(k));
}

export type ResettableSection =
  | "rayons"
  | "times"
  | "services"
  | "vehicles"
  | "bookings"
  | "destination"
  | "content"
  | "inventory";

export function resetSection(section: ResettableSection) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY[section]);
}
