/**
 * Hotel data — sourced from cloudCache (Supabase). Re-exports the same `HOTELS`
 * constant + `POPULAR_CITIES` so existing imports continue to work; values are
 * filled after hydrate().
 */
import { cloudCache } from "@/modules/shuttle/data/cloudStore";
import type { Hotel } from "../types";

// Proxy that always returns the latest array from cache.
// Existing code does `HOTELS.find(...)` — the find call evaluates each access,
// so we expose getters via a Proxy-like object.
function makeHotelsProxy(): Hotel[] {
  return new Proxy([] as Hotel[], {
    get(_, prop) {
      const arr = cloudCache.hotels;
      const v = (arr as any)[prop];
      return typeof v === "function" ? v.bind(arr) : v;
    },
    has(_, prop) {
      return prop in cloudCache.hotels;
    },
  });
}

export const HOTELS: Hotel[] = makeHotelsProxy();

export const POPULAR_CITIES = ["Bali", "Yogyakarta", "Bandung", "Jakarta", "Surabaya", "Lombok", "Malang"];

export function getHotels(): Hotel[] {
  return cloudCache.hotels;
}

export function getHotelById(id: string): Hotel | undefined {
  return cloudCache.hotels.find((h) => h.id === id);
}
