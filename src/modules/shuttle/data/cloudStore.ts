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
} from "./rayons.seed";
import {
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
  type VehicleTierMapping,
  type VehicleAccessLog,
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
  /** Map of LayoutKey -> ISO timestamp of last update from cloud. */
  seatLayoutTimestamps: Record<string, string>;
  /** Payment gateway settings (provider, mode, methods, credentials). */
  paymentSettings?: import("./payment").PaymentSettings;
  /** Vehicle × Tier access mapping: deklaratif tier-based vehicle access control. */
  vehicleTierMappings: VehicleTierMapping[];
  /** Fare calculation settings. */
  fareSettings: import("./services").FareSettings;
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
  seatLayoutTimestamps: {},
  vehicleTierMappings: [],
  fareSettings: {
    calculationMethod: "distance_based",
    minFare: 50000,
    maxDistanceKm: 500,
    enableLogging: true,
  },
  hydrated: false,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
/** Public notify for callers that mutate `cloudCache` directly (e.g. repository rollback). */
export function notifyStore() {
  notify();
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
    const [
      rayonRes,
      ppRes,
      svcRes,
      vehRes,
      layoutRes,
      timesRes,
      settingsRes,
      bookingsRes,
      blocksRes,
      hotelsRes,
      roomsRes,
      vehicleTierRes,
    ] = await Promise.all([
      supabase.from("rayons").select("*").order("sort_order"),
      supabase.from("pickup_points").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("vehicle_types").select("*").order("sort_order"),
      supabase.from("seat_layouts").select("*"),
      supabase.from("depart_times").select("*").order("sort_order"),
      supabase.from("shuttle_settings").select("*"),
      supabase
        .from("shuttle_bookings")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("seat_blocks").select("*"),
      supabase
        .from("hotels")
        .select("*")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("room_types").select("*").order("sort_order"),
      supabase.from("vehicle_tier_mapping" as any).select("*"),
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
      cache.services = svcRes.data.map((s: any) => ({
        tier: s.tier as ServiceTier,
        label: s.label,
        description: s.description,
        farePerKm: Number(s.fare_per_km || s.price_multiplier || 1500),
        features: s.features || [],
        active: s.active,
      }));
    }

    // Vehicles + seat_layouts (totalSeats from layout capacity)
    if (vehRes.data) {
      const layoutByVehTier = new Map<string, { capacity: number }>();
      (layoutRes.data || []).forEach((l) => {
        layoutByVehTier.set(`${l.vehicle_id}_${l.tier}`, {
          capacity: l.capacity,
        });
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
          tierPrices: (v.tier_prices || {}) as Partial<
            Record<ServiceTier, number>
          >,
          totalSeats: reg?.capacity ?? 0,
        };
      });
    }

    // Seat layouts: build map keyed by LayoutKey ("HIACE_REGULER" etc.)
    if (layoutRes.data) {
      const map: Record<string, Partial<SeatLayoutConfig>> = {};
      const ts: Record<string, string> = {};
      layoutRes.data.forEach((l) => {
        const tierSuffix =
          l.tier === "executive"
            ? "EXEC"
            : l.tier === "semi-executive"
              ? "SEMI"
              : "REGULER";
        const key = `${(l.vehicle_id || "").toUpperCase()}_${tierSuffix}`;
        map[key] = (l.layout || {}) as Partial<SeatLayoutConfig>;
        ts[key] = l.updated_at;
      });
      cache.seatLayouts = map;
      cache.seatLayoutTimestamps = ts;
    }

    if (timesRes.data) {
      cache.departTimes = timesRes.data.map((t) => t.time);
    }

    if (settingsRes.data) {
      const dest = settingsRes.data.find((s) => s.key === "destination");
      const cnt = settingsRes.data.find((s) => s.key === "content");
      const pay = settingsRes.data.find((s) => s.key === "payment_gateway");
      const fare = settingsRes.data.find((s) => s.key === "fare_settings");
      if (dest)
        cache.destination = {
          ...DEFAULT_DESTINATION,
          ...(dest.value as object),
        };
      if (cnt) cache.content = { ...DEFAULT_CONTENT, ...(cnt.value as object) };
      if (fare)
        cache.fareSettings = {
          ...cache.fareSettings,
          ...(fare.value as object),
        };
      if (pay) {
        const { DEFAULT_PAYMENT_SETTINGS } = await import("./payment");
        cache.paymentSettings = {
          ...DEFAULT_PAYMENT_SETTINGS,
          ...(pay.value as object),
        };
      }
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

    // Vehicle Tier Mappings
    if (vehicleTierRes.data) {
      cache.vehicleTierMappings = (vehicleTierRes.data as any[]).map((m) => ({
        id: m.id,
        vehicle_id: m.vehicle_id as VehicleTypeId,
        tier: m.tier as ServiceTier,
        allowed: m.allowed,
        created_at: m.created_at,
        updated_at: m.updated_at,
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
    paymentMethod: row.payment_method ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    paymentRef: row.payment_ref ?? undefined,
  };
}

// ============== Realtime ==============
let realtimeSetup = false;
function setupRealtime() {
  if (realtimeSetup) return;
  realtimeSetup = true;

  supabase
    .channel("cloud-store-bookings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shuttle_bookings" },
      (payload) => {
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
      },
    )
    .subscribe();

  supabase
    .channel("cloud-store-blocks")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "seat_blocks" },
      () => {
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
      },
    )
    .subscribe();

  supabase
    .channel("cloud-store-seat-layouts")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "seat_layouts" },
      () => {
        supabase
          .from("seat_layouts")
          .select("*")
          .then(({ data }) => {
            if (data) {
              const map: Record<string, Partial<SeatLayoutConfig>> = {};
              const ts: Record<string, string> = {};
              data.forEach((l) => {
                const tierSuffix =
                  l.tier === "executive"
                    ? "EXEC"
                    : l.tier === "semi-executive"
                      ? "SEMI"
                      : "REGULER";
                const key = `${(l.vehicle_id || "").toUpperCase()}_${tierSuffix}`;
                map[key] = (l.layout || {}) as Partial<SeatLayoutConfig>;
                ts[key] = l.updated_at;
              });
              cache.seatLayouts = map;
              cache.seatLayoutTimestamps = ts;
              notify();
            }
          });
      },
    )
    .subscribe();

  // ============== Master data realtime (live cross-device sync) ==============
  const refetchDepartTimes = async () => {
    const { data } = await supabase
      .from("depart_times")
      .select("*")
      .order("sort_order");
    if (data) {
      cache.departTimes = data.map((t) => t.time);
      notify();
    }
  };
  const refetchRayonsAndPickups = async () => {
    const [rayonRes, ppRes] = await Promise.all([
      supabase.from("rayons").select("*").order("sort_order"),
      supabase.from("pickup_points").select("*").order("sort_order"),
    ]);
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
      notify();
    }
  };
  const refetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("sort_order");
    if (data) {
      cache.services = data.map((s: any) => ({
        tier: s.tier as ServiceTier,
        label: s.label,
        description: s.description,
        farePerKm: Number(s.fare_per_km || s.price_multiplier || 1500),
        features: s.features || [],
        active: s.active,
      }));
      notify();
    }
  };
  const refetchVehicles = async () => {
    const { data } = await supabase
      .from("vehicle_types")
      .select("*")
      .order("sort_order");
    if (data) {
      cache.vehicles = data.map((v) => {
        const existing = cache.vehicles.find((x) => x.id === v.id);
        return {
          id: v.id as VehicleTypeId,
          label: v.label,
          vehicleName: v.vehicle_name,
          description: v.description,
          active: v.active,
          tierPrices: (v.tier_prices || {}) as Partial<
            Record<ServiceTier, number>
          >,
          totalSeats: existing?.totalSeats ?? 0,
        };
      });
      notify();
    }
  };
  const refetchSettings = async () => {
    const { data } = await supabase.from("shuttle_settings").select("*");
    if (data) {
      const dest = data.find((s) => s.key === "destination");
      const cnt = data.find((s) => s.key === "content");
      const pay = data.find((s) => s.key === "payment_gateway");
      const fare = data.find((s) => s.key === "fare_settings");
      if (dest)
        cache.destination = {
          ...DEFAULT_DESTINATION,
          ...(dest.value as object),
        };
      if (cnt) cache.content = { ...DEFAULT_CONTENT, ...(cnt.value as object) };
      if (fare)
        cache.fareSettings = {
          ...cache.fareSettings,
          ...(fare.value as object),
        };
      if (pay) {
        const { DEFAULT_PAYMENT_SETTINGS } = await import("./payment");
        cache.paymentSettings = {
          ...DEFAULT_PAYMENT_SETTINGS,
          ...(pay.value as object),
        };
      }
      notify();
    }
  };
  const refetchVehicleTierMappings = async () => {
    const { data } = await supabase.from("vehicle_tier_mapping" as any).select("*");
    if (data) {
      cache.vehicleTierMappings = (data as any[]).map((m) => ({
        id: m.id,
        vehicle_id: m.vehicle_id as VehicleTypeId,
        tier: m.tier as ServiceTier,
        allowed: m.allowed,
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));
      notify();
    }
  };

  supabase
    .channel("cloud-store-master")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "depart_times" },
      refetchDepartTimes,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rayons" },
      refetchRayonsAndPickups,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pickup_points" },
      refetchRayonsAndPickups,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "services" },
      refetchServices,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "vehicle_types" },
      refetchVehicles,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shuttle_settings" },
      refetchSettings,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "vehicle_tier_mapping" as any },
      refetchVehicleTierMappings,
    )
    .subscribe();
}

// ============== Cache accessors ==============
export const cloudCache = cache;
export function isHydrated() {
  return cache.hydrated;
}

// ============== Mutations ==============

/** Generic save result returned by all persist* functions. */
export interface SaveResult {
  ok: boolean;
  error?: { code?: string; message: string };
}

export async function persistRayons(rayons: Rayon[]): Promise<SaveResult> {
  // Upsert rayon rows — primary RLS probe
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
  const upRes = await supabase.from("rayons").upsert(rayonRows).select("id");
  if (upRes.error) {
    console.error("[cloudStore] persistRayons upsert failed:", upRes.error);
    return {
      ok: false,
      error: { code: upRes.error.code, message: upRes.error.message },
    };
  }
  // RLS silent-fail probe: if we sent rows but got 0 back, likely blocked
  if (rayonRows.length > 0 && (upRes.data?.length ?? 0) === 0) {
    return {
      ok: false,
      error: { code: "42501", message: "row-level security: upsert blocked" },
    };
  }

  const ids = rayons.map((r) => r.id);
  if (ids.length > 0) {
    const delRes = await supabase
      .from("rayons")
      .delete()
      .not("id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`);
    if (delRes.error) {
      console.error("[cloudStore] persistRayons delete failed:", delRes.error);
      return {
        ok: false,
        error: { code: delRes.error.code, message: delRes.error.message },
      };
    }
  }
  // Pickup points: delete + reinsert per rayon
  for (const r of rayons) {
    const ppDel = await supabase
      .from("pickup_points")
      .delete()
      .eq("rayon_id", r.id);
    if (ppDel.error) {
      return {
        ok: false,
        error: { code: ppDel.error.code, message: ppDel.error.message },
      };
    }
    if (r.pickupPoints.length > 0) {
      const ppIns = await supabase.from("pickup_points").insert(
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
      if (ppIns.error) {
        return {
          ok: false,
          error: { code: ppIns.error.code, message: ppIns.error.message },
        };
      }
    }
  }
  cache.rayons = rayons;
  notify();
  return { ok: true };
}

export type DepartTimesSaveResult = SaveResult;

export async function persistDepartTimes(times: string[]): Promise<SaveResult> {
  // Strategy: incremental sync — insert new times, update sort_order on existing,
  // delete times no longer in list. INSERT acts as the RLS probe (returns 42501
  // for non-admin), so we INSERT first when there are new entries.
  const { data: existing, error: fetchErr } = await supabase
    .from("depart_times")
    .select("id,time,sort_order");
  if (fetchErr) {
    console.error("[cloudStore] persistDepartTimes fetch failed:", fetchErr);
    return {
      ok: false,
      error: { code: fetchErr.code, message: fetchErr.message },
    };
  }

  const existingByTime = new Map((existing || []).map((r) => [r.time, r]));
  const desiredSet = new Set(times);

  const toInsert = times
    .map((t, i) => ({ time: t, sort_order: i }))
    .filter((row) => !existingByTime.has(row.time));

  const toDeleteIds = (existing || [])
    .filter((r) => !desiredSet.has(r.time))
    .map((r) => r.id);

  const toUpdate = times
    .map((t, i) => {
      const ex = existingByTime.get(t);
      if (ex && ex.sort_order !== i) return { id: ex.id, sort_order: i };
      return null;
    })
    .filter((x): x is { id: string; sort_order: number } => x !== null);

  // INSERT first — primary RLS probe
  if (toInsert.length > 0) {
    const insRes = await supabase.from("depart_times").insert(toInsert);
    if (insRes.error) {
      console.error(
        "[cloudStore] persistDepartTimes insert failed:",
        insRes.error,
      );
      return {
        ok: false,
        error: { code: insRes.error.code, message: insRes.error.message },
      };
    }
  } else if (toDeleteIds.length > 0) {
    // No inserts — verify DELETE actually applies. Use returning to detect RLS silent-fail.
    const delProbe = await supabase
      .from("depart_times")
      .delete()
      .in("id", toDeleteIds)
      .select("id");
    if (delProbe.error) {
      console.error(
        "[cloudStore] persistDepartTimes delete failed:",
        delProbe.error,
      );
      return {
        ok: false,
        error: { code: delProbe.error.code, message: delProbe.error.message },
      };
    }
    if ((delProbe.data?.length ?? 0) === 0) {
      return {
        ok: false,
        error: { code: "42501", message: "row-level security: delete blocked" },
      };
    }
    // Then handle updates
    for (const u of toUpdate) {
      const upRes = await supabase
        .from("depart_times")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id);
      if (upRes.error) {
        return {
          ok: false,
          error: { code: upRes.error.code, message: upRes.error.message },
        };
      }
    }
    return { ok: true };
  }

  // UPDATE sort_orders
  for (const u of toUpdate) {
    const upRes = await supabase
      .from("depart_times")
      .update({ sort_order: u.sort_order })
      .eq("id", u.id);
    if (upRes.error) {
      console.error(
        "[cloudStore] persistDepartTimes update failed:",
        upRes.error,
      );
      return {
        ok: false,
        error: { code: upRes.error.code, message: upRes.error.message },
      };
    }
  }

  // DELETE removed times (after insert succeeded above)
  if (toInsert.length > 0 && toDeleteIds.length > 0) {
    const delRes = await supabase
      .from("depart_times")
      .delete()
      .in("id", toDeleteIds);
    if (delRes.error) {
      console.error(
        "[cloudStore] persistDepartTimes delete failed:",
        delRes.error,
      );
      return {
        ok: false,
        error: { code: delRes.error.code, message: delRes.error.message },
      };
    }
  }

  return { ok: true };
}

export async function persistServices(
  services: ServiceConfig[],
): Promise<SaveResult> {
  const rows = services.map((s, i) => ({
    tier: s.tier,
    label: s.label,
    description: s.description,
    price_multiplier: s.farePerKm,
    features: s.features,
    active: s.active ?? true,
    sort_order: i,
  }));
  const res = await supabase.from("services").upsert(rows).select("tier");
  if (res.error) {
    console.error("[cloudStore] persistServices failed:", res.error);
    return {
      ok: false,
      error: { code: res.error.code, message: res.error.message },
    };
  }
  if (rows.length > 0 && (res.data?.length ?? 0) === 0) {
    return {
      ok: false,
      error: { code: "42501", message: "row-level security: upsert blocked" },
    };
  }
  cache.services = services;
  notify();
  return { ok: true };
}

export async function persistVehicles(
  vehicles: VehicleType[],
): Promise<SaveResult> {
  const rows = vehicles.map((v, i) => ({
    id: v.id,
    label: v.label,
    vehicle_name: v.vehicleName,
    description: v.description,
    tier_prices: v.tierPrices ?? {},
    active: v.active ?? true,
    sort_order: i,
  }));
  const res = await supabase.from("vehicle_types").upsert(rows).select("id");
  if (res.error) {
    console.error("[cloudStore] persistVehicles failed:", res.error);
    return {
      ok: false,
      error: { code: res.error.code, message: res.error.message },
    };
  }
  if (rows.length > 0 && (res.data?.length ?? 0) === 0) {
    return {
      ok: false,
      error: { code: "42501", message: "row-level security: upsert blocked" },
    };
  }
  cache.vehicles = vehicles;
  notify();
  return { ok: true };
}

export async function persistDestination(d: Destination): Promise<SaveResult> {
  const res = await supabase
    .from("shuttle_settings")
    .upsert({ key: "destination", value: d as any })
    .select("key");
  if (res.error) {
    console.error("[cloudStore] persistDestination failed:", res.error);
    return {
      ok: false,
      error: { code: res.error.code, message: res.error.message },
    };
  }
  if ((res.data?.length ?? 0) === 0) {
    return {
      ok: false,
      error: { code: "42501", message: "row-level security: upsert blocked" },
    };
  }
  cache.destination = d;
  notify();
  return { ok: true };
}

export async function persistContent(c: ShuttleContent): Promise<SaveResult> {
  const res = await supabase
    .from("shuttle_settings")
    .upsert({ key: "content", value: c as any })
    .select("key");
  if (res.error) {
    console.error("[cloudStore] persistContent failed:", res.error);
    return {
      ok: false,
      error: { code: res.error.code, message: res.error.message },
    };
  }
  if ((res.data?.length ?? 0) === 0) {
    return {
      ok: false,
      error: { code: "42501", message: "row-level security: upsert blocked" },
    };
  }
  cache.content = c;
  notify();
  return { ok: true };
}

// Bookings
function genBookingCode() {
  return `TRV-S${Date.now().toString().slice(-7)}`;
}

export async function createBooking(
  b: Omit<ShuttleBooking, "id" | "createdAt" | "status"> & {
    status?: BookingStatus;
  },
): Promise<ShuttleBooking> {
  const code = genBookingCode();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("shuttle_bookings")
    .insert({
      code,
      customer_id: user?.id ?? null,
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
      payment_method: b.paymentMethod,
      payment_status: b.paymentStatus,
      payment_ref: b.paymentRef,
    } as any)
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

export async function setBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<void> {
  await supabase.from("shuttle_bookings").update({ status }).eq("code", id);
  cache.bookings = cache.bookings.map((b) =>
    b.id === id ? { ...b, status } : b,
  );
  notify();
}

export async function removeBooking(id: string): Promise<void> {
  await supabase.from("shuttle_bookings").delete().eq("code", id);
  cache.bookings = cache.bookings.filter((b) => b.id !== id);
  notify();
}

// Seat blocks
export async function setBlockedSeatsCloud(
  slot: {
    date: string;
    time: string;
    rayonId: string;
    vehicleId: string;
    tier: string;
  },
  seats: number[],
): Promise<void> {
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

// ============== Seat Layouts ==============
/**
 * Decode a LayoutKey (e.g. "HIACE_REGULER", "SUV_SEMI", "MINICAR_EXEC")
 * into the DB's vehicle_id (lowercase) + tier columns.
 */
function decodeLayoutKey(key: string): { vehicleId: string; tier: string } {
  const parts = key.split("_");
  const v = (parts[0] || "").toLowerCase();
  const suffix = parts[1] || "REGULER";
  const tier =
    suffix === "EXEC"
      ? "executive"
      : suffix === "SEMI"
        ? "semi-executive"
        : "reguler";
  return { vehicleId: v, tier };
}

export async function persistSeatLayout(
  layoutKey: string,
  payload: Partial<SeatLayoutConfig>,
): Promise<void> {
  const { vehicleId, tier } = decodeLayoutKey(layoutKey);
  const capacity = payload.seats?.length ?? 0;
  await supabase
    .from("seat_layouts")
    .delete()
    .eq("vehicle_id", vehicleId)
    .eq("tier", tier);
  const { data, error } = await supabase
    .from("seat_layouts")
    .insert({
      vehicle_id: vehicleId,
      tier,
      layout: payload as any,
      capacity,
    })
    .select()
    .single();
  if (error) throw error;
  cache.seatLayouts = { ...cache.seatLayouts, [layoutKey]: payload };
  cache.seatLayoutTimestamps = {
    ...cache.seatLayoutTimestamps,
    [layoutKey]: data?.updated_at ?? new Date().toISOString(),
  };
  notify();
}

export async function clearSeatLayoutCloud(layoutKey: string): Promise<void> {
  const { vehicleId, tier } = decodeLayoutKey(layoutKey);
  await supabase
    .from("seat_layouts")
    .delete()
    .eq("vehicle_id", vehicleId)
    .eq("tier", tier);
  const next = { ...cache.seatLayouts };
  delete next[layoutKey];
  cache.seatLayouts = next;
  const nextTs = { ...cache.seatLayoutTimestamps };
  delete nextTs[layoutKey];
  cache.seatLayoutTimestamps = nextTs;
  notify();
}

// ============== Storage: seat layout images ==============
const SEAT_LAYOUT_BUCKET = "seat-layout-images";

/**
 * Upload a seat layout diagram image to Storage.
 * Returns the public URL on success.
 * Path format: {layoutKey-lower}-{timestamp}.{ext}
 */
export async function uploadSeatLayoutImage(
  layoutKey: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${layoutKey.toLowerCase()}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(SEAT_LAYOUT_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || `image/${ext}`,
      cacheControl: "3600",
    });
  if (error) throw error;
  const { data } = supabase.storage.from(SEAT_LAYOUT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort delete an image from the bucket given its public URL. */
export async function deleteSeatLayoutImageByUrl(url: string): Promise<void> {
  try {
    const marker = `/${SEAT_LAYOUT_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx < 0) return;
    const path = url.slice(idx + marker.length);
    await supabase.storage.from(SEAT_LAYOUT_BUCKET).remove([path]);
  } catch (err) {
    console.warn("[cloudStore] deleteSeatLayoutImageByUrl failed:", err);
  }
}

// ============== Vehicle Tier Access Control ==============

/**
 * Get all vehicle tier mappings from cache.
 * Used by admin to manage tier-vehicle access matrix.
 */
export function getVehicleTierMappings(): VehicleTierMapping[] {
  return cache.vehicleTierMappings;
}

/**
 * Check if a vehicle is allowed for a specific tier.
 * Returns true if mapping exists AND allowed=true, otherwise false.
 */
export function isVehicleAllowedForTier(
  vehicleId: VehicleTypeId,
  tier: ServiceTier,
): boolean {
  const mapping = cache.vehicleTierMappings.find(
    (m) => m.vehicle_id === vehicleId && m.tier === tier,
  );
  return mapping?.allowed ?? true; // Default to allowed if no mapping exists
}

/**
 * Get allowed vehicles for a specific tier.
 * Filters active vehicles that are allowed for this tier.
 */
export function getVehiclesForTier(tier: ServiceTier): VehicleType[] {
  return cache.vehicles.filter(
    (v) => v.active !== false && isVehicleAllowedForTier(v.id, tier),
  );
}

/**
 * Persist vehicle tier mappings from admin.
 * Updates allowed status for vehicle-tier combinations.
 */
export async function persistVehicleTierMappings(
  mappings: VehicleTierMapping[],
): Promise<SaveResult> {
  const rows = mappings.map((m) => {
    const row: any = {
      vehicle_id: m.vehicle_id,
      tier: m.tier,
      allowed: m.allowed,
    };

    // Only include id if it's a valid UUID (not a temporary UI-generated ID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (m.id && uuidRegex.test(m.id)) {
      row.id = m.id;
    }

    return row;
  });

  const res = await supabase
    .from("vehicle_tier_mapping" as any)
    .upsert(rows, { onConflict: "vehicle_id,tier" })
    .select("id");

  if (res.error) {
    console.error("[cloudStore] persistVehicleTierMappings failed:", res.error);
    return {
      ok: false,
      error: { code: res.error.code, message: res.error.message },
    };
  }

  if (rows.length > 0 && (res.data?.length ?? 0) === 0) {
    return {
      ok: false,
      error: { code: "42501", message: "row-level security: upsert blocked" },
    };
  }

  cache.vehicleTierMappings = mappings;
  notify();
  return { ok: true };
}

// ============== Fare Settings & Activity Logging ==============

/**
 * Persist fare settings from admin.
 * Updates calculation method, min fare, and max distance.
 */
export async function persistFareSettings(
  settings: import("./services").FareSettings,
): Promise<SaveResult> {
  const { error } = await supabase.from("shuttle_settings").upsert({
    key: "fare_settings",
    value: settings as any,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[cloudStore] persistFareSettings failed:", error);
    return {
      ok: false,
      error: { code: error.code, message: error.message },
    };
  }

  cache.fareSettings = settings;
  notify();
  return { ok: true };
}

/**
 * Log an admin activity (settings change, price update, etc).
 * Fire-and-forget: logs asynchronously.
 */
export async function logShuttleActivity(
  action: string,
  details: any,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ipAddress: string | null = null;
  // Basic user agent detection
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

  const { error } = await supabase.from("shuttle_activity_logs" as any).insert({
    user_id: user?.id ?? null,
    action,
    details,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    console.warn("[cloudStore] logShuttleActivity failed:", error);
  }
}

/**
 * Get activity logs for admin dashboard.
 */
export async function getShuttleActivityLogs(
  limit: number = 50,
  offset: number = 0,
): Promise<import("./services").ShuttleActivityLog[]> {
  const { data, error } = await supabase
    .from("shuttle_activity_logs" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[cloudStore] getShuttleActivityLogs failed:", error);
    return [];
  }

  return (data || []).map((log: any) => ({
    id: log.id,
    user_id: log.user_id,
    action: log.action,
    details: log.details,
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    created_at: log.created_at,
  }));
}

// ============== Vehicle Access Logging ==============

/**
 * Log a vehicle access attempt.
 * Called for view, book, or bypass_attempt actions.
 * Fire-and-forget: logs asynchronously without blocking UI.
 */
export async function logVehicleAccess(
  vehicleId: VehicleTypeId,
  tier: ServiceTier,
  action: "view" | "book" | "bypass_attempt",
  result: "allowed" | "blocked" | "not_configured",
  reason?: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get IP address via edge function if available, fallback to null
  let ipAddress: string | null = null;
  try {
    // In a real app, you'd get this from headers or a serverless function
    // For now, we'll rely on Supabase auth context
  } catch (e) {
    // Silently fail IP detection
  }

  const logEntry: any = {
    user_id: user?.id ?? null,
    vehicle_id: vehicleId,
    tier,
    action,
    result,
    reason: reason ?? null,
  };

  // Only include ip_address and user_agent if they are available to avoid 
  // schema cache issues during migrations if columns were just added
  if (ipAddress) {
    logEntry.ip_address = ipAddress;
  }
  
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    logEntry.user_agent = navigator.userAgent;
  }

  const { error } = await supabase.from("vehicle_access_logs" as any).insert(logEntry);

  if (error) {
    console.warn("[cloudStore] logVehicleAccess failed:", error);
    // Don't throw — logging failures shouldn't crash the booking flow
  }
}

/**
 * Get access logs for admin dashboard.
 * Paginated query with optional filters.
 */
export async function getVehicleAccessLogs(
  options: {
    vehicleId?: VehicleTypeId;
    tier?: ServiceTier;
    result?: "allowed" | "blocked" | "not_configured";
    limit?: number;
    offset?: number;
  } = {},
): Promise<VehicleAccessLog[]> {
  const { vehicleId, tier, result, limit = 50, offset = 0 } = options;

  let query = supabase.from("vehicle_access_logs" as any).select("*");

  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (tier) query = query.eq("tier", tier);
  if (result) query = query.eq("result", result);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[cloudStore] getVehicleAccessLogs failed:", error);
    return [];
  }

  return (data || []).map((log: any) => ({
    id: log.id,
    user_id: log.user_id,
    vehicle_id: log.vehicle_id as VehicleTypeId,
    tier: log.tier as ServiceTier,
    action: log.action,
    result: log.result,
    reason: log.reason,
    ip_address: log.ip_address ?? null,
    user_agent: log.user_agent ?? null,
    created_at: log.created_at,
  }));
}

/**
 * Purge vehicle access logs older than specified days.
 * Admin-only operation.
 */
export async function purgeOldAccessLogs(
  daysOld: number = 90,
): Promise<SaveResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { error } = await supabase
    .from("vehicle_access_logs" as any)
    .delete()
    .lt("created_at", cutoffDate.toISOString());

  if (error) {
    console.error("[cloudStore] purgeOldAccessLogs failed:", error);
    return {
      ok: false,
      error: { code: error.code, message: error.message },
    };
  }

  return { ok: true };
}
