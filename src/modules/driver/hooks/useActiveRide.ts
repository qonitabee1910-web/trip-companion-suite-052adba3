import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Ride } from "../data/driver";

export function useActiveRide(rideId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rideId) {
      setRide(null);
      setLoading(false);
      return;
    }
    let active = true;

    const load = async () => {
      const { data } = await supabase.from("rides").select("*").eq("id", rideId).maybeSingle();
      if (!active) return;
      setRide((data as Ride) ?? null);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`ride-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => setRide(payload.new as Ride),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  return { ride, loading };
}

export function useDriverActiveRide(driverId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null);

  useEffect(() => {
    if (!driverId) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", driverId)
        .in("status", ["accepted", "arriving", "in_progress"])
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      setRide((data as Ride) ?? null);
    };
    load();

    const channel = supabase
      .channel(`driver-rides-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides", filter: `driver_id=eq.${driverId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return ride;
}
