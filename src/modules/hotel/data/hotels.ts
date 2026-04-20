/**
 * Hotel data — sourced from the hotel module's cloud store. Backward-compatible
 * with existing `HOTELS.find(...)` callers via Proxy.
 */
import { getHotels } from "./cloudStore";
import type { Hotel } from "../types";

function makeHotelsProxy(): Hotel[] {
  return new Proxy([] as Hotel[], {
    get(_, prop) {
      const arr = getHotels();
      const v = (arr as any)[prop];
      return typeof v === "function" ? v.bind(arr) : v;
    },
    has(_, prop) {
      return prop in getHotels();
    },
  });
}

export const HOTELS: Hotel[] = makeHotelsProxy();

export const POPULAR_CITIES = ["Bali", "Yogyakarta", "Bandung", "Jakarta", "Surabaya", "Lombok", "Malang"];

export { getHotels, getHotelById } from "./cloudStore";
