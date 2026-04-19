import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Ride } from "../data/driver";
import { distanceTo } from "../data/driver";

interface Options {
  enabled: boolean;
  driverPos: { lat: number; lng: number } | null;
  maxKm?: number;
}

export function useIncomingRides({ enabled, driverPos, maxKm = 5 }: Options) {
  const [pending, setPending] = useState<Ride[]>([]);

  useEffect(() => {
    if (!enabled) {
      setPending([]);
      return;
    }

    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(20);
      if (!active) return;
      setPending((data as Ride[]) ?? []);
    };
    load();

    const channel = supabase
      .channel("driver-incoming")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: "status=eq.pending" },
        (payload) => setPending((prev) => [payload.new as Ride, ...prev]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides" },
        (payload) => {
          const r = payload.new as Ride;
          setPending((prev) =>
            r.status === "pending"
              ? prev.some((x) => x.id === r.id)
                ? prev.map((x) => (x.id === r.id ? r : x))
                : [r, ...prev]
              : prev.filter((x) => x.id !== r.id),
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  const filtered = driverPos
    ? pending.filter((r) => distanceTo(driverPos, { lat: r.pickup_lat, lng: r.pickup_lng }) <= maxKm)
    : pending;

  return { pending: filtered };
}
