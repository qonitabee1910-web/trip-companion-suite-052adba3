import { distanceKm } from "@/modules/ride/data/ride";

export type RideStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Ride {
  id: string;
  rider_id: string | null;
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

export interface DriverRow {
  id: string;
  vehicle_type: string;
  plate: string | null;
  rating: number;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  updated_at: string;
}

export const isRideActive = (s: RideStatus) =>
  s === "accepted" || s === "arriving" || s === "in_progress";

export const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const distanceTo = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => distanceKm(a, b);
