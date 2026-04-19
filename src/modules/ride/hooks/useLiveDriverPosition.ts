import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveDriverPos {
  lat: number;
  lng: number;
  updatedAt: string;
}

/**
 * Subscribe ke posisi realtime sebuah driver di tabel `drivers`.
 * Jika `driverId` null, hook nonaktif. Mengembalikan null sampai data tersedia.
 */
export function useLiveDriverPosition(driverId: string | null) {
  const [pos, setPos] = useState<LiveDriverPos | null>(null);

  useEffect(() => {
    if (!driverId) {
      setPos(null);
      return;
    }

    let cancelled = false;

    // Ambil snapshot awal
    (async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("current_lat, current_lng, updated_at")
        .eq("id", driverId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      if (data.current_lat != null && data.current_lng != null) {
        setPos({
          lat: data.current_lat,
          lng: data.current_lng,
          updatedAt: data.updated_at,
        });
      }
    })();

    // Subscribe perubahan row driver tsb
    const channel = supabase
      .channel(`driver-pos-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drivers",
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          const row = payload.new as {
            current_lat: number | null;
            current_lng: number | null;
            updated_at: string;
          };
          if (row.current_lat != null && row.current_lng != null) {
            setPos({
              lat: row.current_lat,
              lng: row.current_lng,
              updatedAt: row.updated_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return pos;
}

/**
 * Cari satu driver online terdekat dari titik pickup (untuk demo / fallback).
 * Mengembalikan id driver atau null.
 */
export async function findNearestOnlineDriver(
  pickup: { lat: number; lng: number }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, current_lat, current_lng")
    .eq("is_online", true)
    .not("current_lat", "is", null)
    .not("current_lng", "is", null);

  if (error || !data || data.length === 0) return null;

  const withDist = data
    .map((d) => {
      const dLat = ((d.current_lat! - pickup.lat) * Math.PI) / 180;
      const dLng = ((d.current_lng! - pickup.lng) * Math.PI) / 180;
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((pickup.lat * Math.PI) / 180) *
          Math.cos((d.current_lat! * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
      return { id: d.id, dist };
    })
    .sort((a, b) => a.dist - b.dist);

  return withDist[0]?.id ?? null;
}
