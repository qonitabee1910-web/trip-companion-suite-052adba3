import { supabase } from "@/integrations/supabase/client";

export type RideStatus = "pending" | "accepted" | "rejected" | "arriving" | "in_progress" | "completed" | "cancelled";

export interface RideRequest {
  id: string;
  rider_id: string;
  driver_id: string | null;
  status: RideStatus;
  pickup_lat: number;
  pickup_lng: number;
  pickup_name: string;
  dest_lat: number;
  dest_lng: number;
  dest_name: string;
  ride_type: string;
  fare: number;
  distance_km: number;
  requested_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Create a new ride request in Supabase
 */
export async function createRideRequest(
  riderId: string,
  pickupLat: number,
  pickupLng: number,
  pickupName: string,
  destLat: number,
  destLng: number,
  destName: string,
  rideType: string,
  fare: number,
  distanceKm: number
): Promise<RideRequest | null> {
  const { data, error } = await supabase
    .from("rides")
    .insert({
      rider_id: riderId,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_name: pickupName,
      dest_lat: destLat,
      dest_lng: destLng,
      dest_name: destName,
      ride_type: rideType,
      fare,
      distance_km: distanceKm,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating ride request:", error);
    return null;
  }

  return data;
}

/**
 * Get a specific ride by ID
 */
export async function getRideById(rideId: string): Promise<RideRequest | null> {
  const { data, error } = await supabase.from("rides").select("*").eq("id", rideId).single();

  if (error) {
    console.error("Error fetching ride:", error);
    return null;
  }

  return data;
}

/**
 * Cancel a ride request
 */
export async function cancelRide(rideId: string): Promise<boolean> {
  const { error } = await supabase
    .from("rides")
    .update({ status: "cancelled" })
    .eq("id", rideId);

  if (error) {
    console.error("Error cancelling ride:", error);
    return false;
  }

  return true;
}

/**
 * Subscribe to real-time ride status updates
 */
export function subscribeToRideUpdates(
  rideId: string,
  callback: (ride: RideRequest) => void
) {
  const channel = supabase
    .channel(`ride-${rideId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rides",
        filter: `id=eq.${rideId}`,
      },
      (payload) => {
        callback(payload.new as RideRequest);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get user's ride history
 */
export async function getRideHistory(riderId: string, limit = 10): Promise<RideRequest[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .eq("rider_id", riderId)
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching ride history:", error);
    return [];
  }

  return data || [];
}
