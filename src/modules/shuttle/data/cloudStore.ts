/**
 * Cloud-backed in-memory store for shuttle + hotel master data and bookings.
 *
 * Strategy:
 * - On app boot, hydrate everything from Supabase into module-level caches.
 * - Sync getters return the cache (so existing code that expects sync values still works).
 * - Mutations: write to Supabase, then update cache + notify subscribers.
 * - Realtime: postgres_changes keep cache in sync across devices.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  RAYONS as DEFAULT_RAYONS,
  DEPART_TIMES as DEFAULT_TIMES,
  DEFAULT_DESTINATION,
  DEFAULT_CONTENT,
  type Rayon,
  type Destination,
  type ShuttleContent,
  type PickupPoint,
} from "./rayons";
import {
  SERVICES as DEFAULT_SERVICES,
  VEHICLE_TYPES as DEFAULT_VEHICLES,
  type ServiceConfig,
  type ServiceTier,
  type VehicleType,
  type VehicleTypeId,
} from "./services";
import type { ShuttleBooking, BookingStatus } from "../types/booking";
import type { Hotel } from "@/modules/hotel/types";
import type { SeatLayoutConfig } from "./seatLayouts";

// ============== Cache ==============
interface Cache {
  rayons: Rayon[];
  services: ServiceConfig[];
  vehicles: VehicleType[];
  departTimes: string[];
  destination: Destination;
  content: ShuttleContent;
  bookings: ShuttleBooking[];
  seatBlocks: SeatBlock[];
  hotels: Hotel[];
  /** Map of LayoutKey (e.g. "HIACE_REGULER") -> stored layout payload (without image baked-in unless saved that way). */
  seatLayouts: Record<string, Partial<SeatLayoutConfig>>;
  hydrated: boolean;
}

export interface SeatBlock {
  id: string;
  date: string;
  time: string;
  rayonId: string;
  vehicleId: string;
  tier: string;
  seatNumber: number;
}

const cache: Cache = {
  rayons: DEFAULT_RAYONS,
  services: DEFAULT_SERVICES,
  vehicles: DEFAULT_VEHICLES,
  departTimes: DEFAULT_TIMES,
  destination: DEFAULT_DESTINATION,
  content: DEFAULT_CONTENT,
  bookings: [],
  seatBlocks: [],
  hotels: [],
  seatLayouts: {},
  hydrated: false,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeStore(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ============== Hydration ==============
let hydratePromise: Promise<void> | null = null;

export function ensureHydrated(): Promise<void> {
  if (cache.hydrated) return Promise.resolve();
  if (!hydratePromise) hydratePromise = hydrate();
  return hydratePromise;
}

async function hydrate() {
  try {
    const [rayonRes, ppRes, svcRes, vehRes, layoutRes, timesRes, settingsRes, bookingsRes, blocksRes, hotelsRes, roomsRes] = await Promise.all([
      supabase.from("rayons").select("*").order("sort_order"),
      supabase.from("pickup_points").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("vehicle_types").select("*").order("sort_order"),
      supabase.from("seat_layouts").select("*"),
      supabase.from("depart_times").select("*").order("sort_order"),
      supabase.from("shuttle_settings").select("*"),
      supabase.from("shuttle_bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("seat_blocks").select("*"),
      supabase.from("hotels").select("*").eq("active", true).order("sort_order"),
      supabase.from("room_types").select("*").order("sort_order"),
    ]);

    // Rayons + pickup_points join
    if (rayonRes.data) {
      const ppByRayon = new Map<string, PickupPoint[]>();
      (ppRes.data || []).forEach((p) => {
        const arr = ppByRayon.get(p.rayon_id) || [];
        arr.push({
          code: p.code,
          name: p.name,
          time: p.time,
          distanceToNext: p.distance_to_next,
          lat: p.lat ?? undefined,
          lng: p.lng ?? undefined,
        });
        ppByRayon.set(p.rayon_id, arr);
      });
      cache.rayons = rayonRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        area: r.area,
        color: r.color,
        estimateMin: r.estimate_min,
        surcharge: r.surcharge,
        farePerKm: r.fare_per_km,
        perPickupFare: r.per_pickup_fare,
        pickupPoints: ppByRayon.get(r.id) || [],
      }));
    }

    if (svcRes.data) {
      cache.services = svcRes.data.map((s) => ({
        tier: s.tier as ServiceTier,
        label: s.label,
        description: s.description,
        priceMultiplier: Number(s.price_multiplier),
        features: s.features || [],
        active: s.active,
      }));
    }

    // Vehicles + seat_layouts (totalSeats from layout capacity)
    if (vehRes.data) {
      const layoutByVehTier = new Map<string, { capacity: number }>();
      (layoutRes.data || []).forEach((l) => {
        layoutByVehTier.set(`${l.vehicle_id}_${l.tier}`, { capacity: l.capacity });
      });
      cache.vehicles = vehRes.data.map((v) => {
        // totalSeats = capacity from reguler tier layout (fallback 0)
        const reg = layoutByVehTier.get(`${v.id}_reguler`);
        return {
          id: v.id as VehicleTypeId,
          label: v.label,
          vehicleName: v.vehicle_name,
          description: v.description,
          active: v.active,
          tierPrices: (v.tier_prices || {}) as Partial<Record<ServiceTier, number>>,
          totalSeats: reg?.capacity ?? 0,
        };
      });
    }

    // Seat layouts: build map keyed by LayoutKey ("HIACE_REGULER" etc.)
    if (layoutRes.data) {
      const map: Record<string, Partial<SeatLayoutConfig>> = {};
      layoutRes.data.forEach((l) => {
        const tierSuffix =
          l.tier === "executive" ? "EXEC" : l.tier === "semi-executive" ? "SEMI" : "REGULER";
        const key = `${(l.vehicle_id || "").toUpperCase()}_${tierSuffix}`;
        map[key] = (l.layout || {}) as Partial<SeatLayoutConfig>;
      });
      cache.seatLayouts = map;
    }

    if (timesRes.data) {
      cache.departTimes = timesRes.data.map((t) => t.time);
    }

    if (settingsRes.data) {
      const dest = settingsRes.data.find((s) => s.key === "destination");
      const cnt = settingsRes.data.find((s) => s.key === "content");
      if (dest) cache.destination = { ...DEFAULT_DESTINATION, ...(dest.value as object) };
      if (cnt) cache.content = { ...DEFAULT_CONTENT, ...(cnt.value as object) };
    }

    if (bookingsRes.data) {
      cache.bookings = bookingsRes.data.map(rowToBooking);
    }

    if (blocksRes.data) {
      cache.seatBlocks = blocksRes.data.map((b) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        rayonId: b.rayon_id,
        vehicleId: b.vehicle_id,
        tier: b.tier,
        seatNumber: b.seat_number,
      }));
    }

    // Hotels
    if (hotelsRes.data) {
      const roomsByHotel = new Map<string, Hotel["rooms"]>();
      (roomsRes.data || []).forEach((r) => {
        const arr = roomsByHotel.get(r.hotel_id) || [];
        arr.push({
          id: r.id,
          name: r.name,
          capacity: r.capacity,
          bed: r.bed,
          price: r.price,
          breakfast: r.breakfast,
          refundable: r.refundable,
        });
        roomsByHotel.set(r.hotel_id, arr);
      });
      cache.hotels = hotelsRes.data.map((h) => ({
        id: h.id,
        name: h.name,
        city: h.city,
        address: h.address,
        stars: h.stars,
        rating: Number(h.rating),
        reviewCount: h.review_count,
        pricePerNight: h.price_per_night,
        originalPrice: h.original_price ?? undefined,
        images: h.images || [],
        amenities: h.amenities || [],
        description: h.description,
        lat: h.lat,
        lng: h.lng,
        rooms: roomsByHotel.get(h.id) || [],
      }));
    }

    cache.hydrated = true;
    notify();
    setupRealtime();
  } catch (err) {
    console.error("[cloudStore] hydration failed:", err);
    cache.hydrated = true; // mark hydrated to allow app to continue with seed defaults
    notify();
  }
}

function rowToBooking(row: any): ShuttleBooking {
  return {
    id: row.code,
    rayonId: row.rayon_id,
    rayonName: row.rayon_name,
    pickup: row.pickup,
    date: row.date,
    time: row.time,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicle_label,
    serviceTier: row.service_tier,
    serviceLabel: row.service_label,
    seats: row.seats || [],
    pax: row.pax,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    status: row.status as BookingStatus,
    createdAt: row.created_at,
  };
}

// ============== Realtime ==============
let realtimeSetup = false;
function setupRealtime() {
  if (realtimeSetup) return;
  realtimeSetup = true;

  supabase
    .channel("cloud-store-bookings")
    .on("postgres_changes", { event: "*", schema: "public", table: "shuttle_bookings" }, (payload) => {
      if (payload.eventType === "INSERT") {
        const b = rowToBooking(payload.new);
        if (!cache.bookings.find((x) => x.id === b.id)) {
          cache.bookings = [b, ...cache.bookings];
          notify();
        }
      } else if (payload.eventType === "UPDATE") {
        const b = rowToBooking(payload.new);
        cache.bookings = cache.bookings.map((x) => (x.id === b.id ? b : x));
        notify();
      } else if (payload.eventType === "DELETE") {
        const oldRow = payload.old as any;
        cache.bookings = cache.bookings.filter((x) => x.id !== oldRow.code);
        notify();
      }
    })
    .subscribe();

  supabase
    .channel("cloud-store-blocks")
    .on("postgres_changes", { event: "*", schema: "public", table: "seat_blocks" }, () => {
      // simple refetch on any block change
      supabase
        .from("seat_blocks")
        .select("*")
        .then(({ data }) => {
          if (data) {
            cache.seatBlocks = data.map((b) => ({
              id: b.id,
              date: b.date,
              time: b.time,
              rayonId: b.rayon_id,
              vehicleId: b.vehicle_id,
              tier: b.tier,
              seatNumber: b.seat_number,
            }));
            notify();
          }
        });
    })
    .subscribe();

  supabase
    .channel("cloud-store-seat-layouts")
    .on("postgres_changes", { event: "*", schema: "public", table: "seat_layouts" }, () => {
      supabase
        .from("seat_layouts")
        .select("*")
        .then(({ data }) => {
          if (data) {
            const map: Record<string, Partial<SeatLayoutConfig>> = {};
            data.forEach((l) => {
              const tierSuffix =
                l.tier === "executive" ? "EXEC" : l.tier === "semi-executive" ? "SEMI" : "REGULER";
              const key = `${(l.vehicle_id || "").toUpperCase()}_${tierSuffix}`;
              map[key] = (l.layout || {}) as Partial<SeatLayoutConfig>;
            });
            cache.seatLayouts = map;
            notify();
          }
        });
    })
    .subscribe();
}

// ============== Cache accessors ==============
export const cloudCache = cache;
export function isHydrated() {
  return cache.hydrated;
}

// ============== Mutations ==============
export async function persistRayons(rayons: Rayon[]): Promise<void> {
  // Replace-all strategy via upsert + delete missing
  const ids = rayons.map((r) => r.id);
  // Upsert rayon rows
  const rayonRows = rayons.map((r, idx) => ({
    id: r.id,
    name: r.name,
    area: r.area,
    color: r.color,
    estimate_min: r.estimateMin,
    surcharge: r.surcharge ?? 0,
    fare_per_km: r.farePerKm ?? 1500,
    per_pickup_fare: r.perPickupFare ?? false,
    sort_order: idx,
  }));
  await supabase.from("rayons").upsert(rayonRows);
  if (ids.length > 0) {
    // delete rayons not in list
    await supabase.from("rayons").delete().not("id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`);
  }
  // Pickup points: delete + reinsert per rayon (simple)
  for (const r of rayons) {
    await supabase.from("pickup_points").delete().eq("rayon_id", r.id);
    if (r.pickupPoints.length > 0) {
      await supabase.from("pickup_points").insert(
        r.pickupPoints.map((p, i) => ({
          rayon_id: r.id,
          code: p.code,
          name: p.name,
          time: p.time,
          distance_to_next: p.distanceToNext,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          sort_order: i,
        })),
      );
    }
  }
  cache.rayons = rayons;
  notify();
}

export async function persistDepartTimes(times: string[]): Promise<void> {
  await supabase.from("depart_times").delete().not("id", "is", null);
  if (times.length > 0) {
    await supabase
      .from("depart_times")
      .insert(times.map((t, i) => ({ time: t, sort_order: i })));
  }
  cache.departTimes = times;
  notify();
}

export async function persistServices(services: ServiceConfig[]): Promise<void> {
  await supabase.from("services").upsert(
    services.map((s, i) => ({
      tier: s.tier,
      label: s.label,
      description: s.description,
      price_multiplier: s.priceMultiplier,
      features: s.features,
      active: s.active ?? true,
      sort_order: i,
    })),
  );
  cache.services = services;
  notify();
}

export async function persistVehicles(vehicles: VehicleType[]): Promise<void> {
  await supabase.from("vehicle_types").upsert(
    vehicles.map((v, i) => ({
      id: v.id,
      label: v.label,
      vehicle_name: v.vehicleName,
      description: v.description,
      tier_prices: v.tierPrices ?? {},
      active: v.active ?? true,
      sort_order: i,
    })),
  );
  cache.vehicles = vehicles;
  notify();
}

export async function persistDestination(d: Destination): Promise<void> {
  await supabase.from("shuttle_settings").upsert({ key: "destination", value: d as any });
  cache.destination = d;
  notify();
}

export async function persistContent(c: ShuttleContent): Promise<void> {
  await supabase.from("shuttle_settings").upsert({ key: "content", value: c as any });
  cache.content = c;
  notify();
}

// Bookings
function genBookingCode() {
  return `TRV-S${Date.now().toString().slice(-7)}`;
}

export async function createBooking(
  b: Omit<ShuttleBooking, "id" | "createdAt" | "status"> & { status?: BookingStatus },
): Promise<ShuttleBooking> {
  const code = genBookingCode();
  const { data, error } = await supabase
    .from("shuttle_bookings")
    .insert({
      code,
      rayon_id: b.rayonId,
      rayon_name: b.rayonName,
      pickup: b.pickup,
      date: b.date,
      time: b.time,
      vehicle_id: b.vehicleId,
      vehicle_label: b.vehicleLabel,
      service_tier: b.serviceTier,
      service_label: b.serviceLabel,
      seats: b.seats,
      pax: b.pax,
      unit_price: b.unitPrice,
      total_price: b.totalPrice,
      customer_name: b.customerName,
      customer_phone: b.customerPhone,
      status: b.status ?? "confirmed",
    })
    .select()
    .single();
  if (error) throw error;
  const booking = rowToBooking(data);
  if (!cache.bookings.find((x) => x.id === booking.id)) {
    cache.bookings = [booking, ...cache.bookings];
    notify();
  }
  return booking;
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<void> {
  await supabase.from("shuttle_bookings").update({ status }).eq("code", id);
  cache.bookings = cache.bookings.map((b) => (b.id === id ? { ...b, status } : b));
  notify();
}

export async function removeBooking(id: string): Promise<void> {
  await supabase.from("shuttle_bookings").delete().eq("code", id);
  cache.bookings = cache.bookings.filter((b) => b.id !== id);
  notify();
}

// Seat blocks
export async function setBlockedSeatsCloud(slot: {
  date: string;
  time: string;
  rayonId: string;
  vehicleId: string;
  tier: string;
}, seats: number[]): Promise<void> {
  await supabase
    .from("seat_blocks")
    .delete()
    .eq("date", slot.date)
    .eq("time", slot.time)
    .eq("rayon_id", slot.rayonId)
    .eq("vehicle_id", slot.vehicleId)
    .eq("tier", slot.tier);
  if (seats.length > 0) {
    await supabase.from("seat_blocks").insert(
      seats.map((n) => ({
        date: slot.date,
        time: slot.time,
        rayon_id: slot.rayonId,
        vehicle_id: slot.vehicleId,
        tier: slot.tier,
        seat_number: n,
      })),
    );
  }
  // optimistic local update
  cache.seatBlocks = cache.seatBlocks
    .filter(
      (b) =>
        !(
          b.date === slot.date &&
          b.time === slot.time &&
          b.rayonId === slot.rayonId &&
          b.vehicleId === slot.vehicleId &&
          b.tier === slot.tier
        ),
    )
    .concat(
      seats.map((n) => ({
        id: `local-${n}-${Date.now()}`,
        ...slot,
        seatNumber: n,
      })),
    );
  notify();
}
