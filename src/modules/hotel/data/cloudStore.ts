/**
 * Hotel cloud store — owns hotel-specific hydration & realtime.
 *
 * For backward compatibility, hotel rows are still kept inside the legacy
 * shared `cloudCache` (so existing realtime + hydration in shuttle's cloudStore
 * keeps working). This module provides a clean entry-point that other code
 * (and the module manifest) can call without importing from shuttle.
 */
import { supabase } from "@/integrations/supabase/client";
import { cloudCache, notifyStore, ensureHydrated } from "@/modules/shuttle/data/cloudStore";
import type { Hotel } from "../types";

/**
 * Trigger hydration. The shuttle cloudStore already pulls hotels in its
 * Promise.all, so this just awaits the shared hydration. Kept as a separate
 * function so the manifest layer doesn't depend on shuttle's internals.
 */
export async function hydrateHotels(): Promise<void> {
  await ensureHydrated();
}

export function getHotels(): Hotel[] {
  return cloudCache.hotels;
}

export function getHotelById(id: string): Hotel | undefined {
  return cloudCache.hotels.find((h) => h.id === id);
}

/** Replace the hotels cache (used by future admin tooling). */
export function setHotelsCache(hotels: Hotel[]) {
  cloudCache.hotels = hotels;
  notifyStore();
}
