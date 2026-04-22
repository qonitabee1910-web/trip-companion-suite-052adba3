/**
 * Driver Profile API
 * Separates driver-specific operations from general user profile management
 */
import { supabase } from "@/integrations/supabase/client";
import { DRIVER_DOCS_BUCKET } from "@/shared/auth/storageBuckets";
import type { UserProfile } from "@/modules/user/data/userApi";

export type DriverVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | null;

export interface DriverProfile extends UserProfile {
  // Driver-specific fields
  vehicle_type: string | null;
  plate: string | null;
  rating: number;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  verification_status?: DriverVerificationStatus;
  sim_url?: string | null;
  stnk_url?: string | null;
  sim_expiry?: string | null;
}

/**
 * Get complete driver profile with all driver-specific data
 */
export async function getDriverProfile(
  driverId: string,
): Promise<DriverProfile | null> {
  const { data: driver } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();

  if (!driver) return null;

  return driver as DriverProfile;
}

/**
 * Update driver-specific information
 */
export async function updateDriverProfile(
  driverId: string,
  updates: Partial<Omit<DriverProfile, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  const driverUpdates = {
    vehicle_type: updates.vehicle_type,
    plate: updates.plate,
    is_online: updates.is_online,
    current_lat: updates.current_lat,
    current_lng: updates.current_lng,
    sim_expiry: updates.sim_expiry,
  };

  // Remove undefined values
  Object.keys(driverUpdates).forEach(
    (key) =>
      driverUpdates[key as keyof typeof driverUpdates] === undefined &&
      delete driverUpdates[key as keyof typeof driverUpdates],
  );

  const { error } = await supabase
    .from("drivers")
    .update(driverUpdates)
    .eq("id", driverId);

  if (error) throw error;
}

/**
 * Upload driver verification documents (SIM, STNK)
 */
export async function uploadDriverDocument(
  driverId: string,
  file: File,
  type: "sim" | "stnk",
): Promise<string> {
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${driverId}/${type}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(DRIVER_DOCS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(DRIVER_DOCS_BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  // Update driver record with document URL
  const updateKey = `${type}_url` as const;
  await supabase
    .from("drivers")
    .update({ [updateKey]: url })
    .eq("id", driverId);

  return url;
}

/**
 * Set driver online/offline status
 */
export async function setDriverOnlineStatus(
  driverId: string,
  isOnline: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("drivers")
    .update({ is_online: isOnline })
    .eq("id", driverId);

  if (error) throw error;
}

/**
 * Update driver location
 */
export async function updateDriverLocation(
  driverId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const { error } = await supabase
    .from("drivers")
    .update({
      current_lat: lat,
      current_lng: lng,
      updated_at: new Date().toISOString(),
    })
    .eq("id", driverId);

  if (error) throw error;
}

/**
 * Get driver statistics (trips, ratings, etc.)
 */
export async function getDriverStats(driverId: string) {
  // Get ride statistics
  const { data: rides, error } = await supabase
    .from("rides")
    .select("id, status, completed_at, created_at")
    .eq("driver_id", driverId);

  if (error) throw error;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todayRides =
    rides?.filter((r) => new Date(r.created_at) >= today) ?? [];
  const weekRides =
    rides?.filter((r) => new Date(r.created_at) >= startOfWeek) ?? [];
  const monthRides =
    rides?.filter((r) => new Date(r.created_at) >= startOfMonth) ?? [];

  return {
    totalTrips: rides?.length ?? 0,
    today: todayRides.length,
    week: weekRides.length,
    month: monthRides.length,
  };
}

/**
 * Get driver's active rides
 */
export async function getDriverActiveRides(driverId: string) {
  const { data: rides, error } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", driverId)
    .in("status", ["accepted", "arriving", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return rides ?? [];
}

/**
 * Get driver's completed rides for history
 */
export async function getDriverRideHistory(driverId: string, limit = 20) {
  const { data: rides, error } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", driverId)
    .in("status", ["completed", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return rides ?? [];
}
