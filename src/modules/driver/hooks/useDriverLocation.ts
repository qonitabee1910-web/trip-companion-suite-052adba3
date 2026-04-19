import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  driverId: string | null;
  enabled: boolean;
  fast?: boolean; // 3s vs 5s
}

export function useDriverLocation({ driverId, enabled, fast = false }: Options) {
  const lastSentRef = useRef<number>(0);
  const lastPosRef = useRef<{ lat: number; lng: number; heading?: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !driverId) return;
    if (!("geolocation" in navigator)) {
      console.warn("[useDriverLocation] geolocation not available");
      return;
    }

    const onPos = (p: GeolocationPosition) => {
      lastPosRef.current = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        heading: p.coords.heading ?? undefined,
      };
    };
    const onErr = (e: GeolocationPositionError) => console.warn("[geo] error", e.message);

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    });

    const minInterval = fast ? 3000 : 5000;
    intervalRef.current = window.setInterval(async () => {
      const pos = lastPosRef.current;
      if (!pos) return;
      const now = Date.now();
      if (now - lastSentRef.current < minInterval) return;
      lastSentRef.current = now;

      await supabase
        .from("drivers")
        .update({ current_lat: pos.lat, current_lng: pos.lng, updated_at: new Date().toISOString() })
        .eq("id", driverId);

      await supabase.from("driver_locations").insert({
        driver_id: driverId,
        lat: pos.lat,
        lng: pos.lng,
        heading: pos.heading ?? null,
      });
    }, 1000);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [driverId, enabled, fast]);

  return { lastPosition: lastPosRef.current };
}
