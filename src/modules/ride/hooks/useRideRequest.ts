import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/shared/auth/useAuth";
import {
  createRideRequest,
  getRideById,
  cancelRide,
  subscribeToRideUpdates,
  type RideRequest,
  type RideStatus,
} from "../services/rideService";

export interface RideState {
  rideId: string | null;
  ride: RideRequest | null;
  status: RideStatus | null;
  loading: boolean;
  error: string | null;
}

export function useRideRequest() {
  const { user } = useAuth();
  const [state, setState] = useState<RideState>({
    rideId: null,
    ride: null,
    status: null,
    loading: false,
    error: null,
  });

  // Request a new ride
  const requestRide = useCallback(
    async (
      pickupLat: number,
      pickupLng: number,
      pickupName: string,
      destLat: number,
      destLng: number,
      destName: string,
      rideType: string,
      fare: number,
      distanceKm: number
    ) => {
      if (!user?.id) {
        setState((prev) => ({ ...prev, error: "User not authenticated" }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      const ride = await createRideRequest(
        user.id,
        pickupLat,
        pickupLng,
        pickupName,
        destLat,
        destLng,
        destName,
        rideType,
        fare,
        distanceKm
      );

      if (!ride) {
        setState((prev) => ({ ...prev, loading: false, error: "Failed to create ride request" }));
        return null;
      }

      setState((prev) => ({
        ...prev,
        rideId: ride.id,
        ride,
        status: ride.status,
        loading: false,
      }));

      return ride;
    },
    [user?.id]
  );

  // Load existing ride
  const loadRide = useCallback(async (rideId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const ride = await getRideById(rideId);

    if (!ride) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Ride not found",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      rideId: ride.id,
      ride,
      status: ride.status,
      loading: false,
    }));
  }, []);

  // Cancel current ride
  const cancel = useCallback(async () => {
    if (!state.rideId) return false;

    setState((prev) => ({ ...prev, loading: true }));
    const success = await cancelRide(state.rideId);

    if (success) {
      setState((prev) => ({
        ...prev,
        status: "cancelled",
        loading: false,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        error: "Failed to cancel ride",
        loading: false,
      }));
    }

    return success;
  }, [state.rideId]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      rideId: null,
      ride: null,
      status: null,
      loading: false,
      error: null,
    });
  }, []);

  // Subscribe to ride updates
  useEffect(() => {
    if (!state.rideId) return;

    const unsubscribe = subscribeToRideUpdates(state.rideId, (updatedRide) => {
      setState((prev) => ({
        ...prev,
        ride: updatedRide,
        status: updatedRide.status,
      }));
    });

    return unsubscribe;
  }, [state.rideId]);

  return {
    ...state,
    requestRide,
    loadRide,
    cancel,
    reset,
  };
}
