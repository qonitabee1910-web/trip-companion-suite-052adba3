import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useActiveRide } from "../hooks/useActiveRide";
import { DriverMap } from "../components/DriverMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MapPin, Navigation2 } from "lucide-react";
import { formatRupiah } from "../data/driver";
import { toast } from "@/hooks/use-toast";

const DriverActiveRide = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ride, loading } = useActiveRide(id ?? null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const w = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  const update = async (patch: TablesUpdate<"rides">) => {
    if (!id) return;
    const { error } = await supabase.from("rides").update(patch).eq("id", id);
    if (error) toast({ title: "Gagal update", description: error.message, variant: "destructive" });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Memuat…</div>;
  if (!ride) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
        <p>Trip tidak ditemukan.</p>
        <Button onClick={() => navigate("/driver")}>Kembali</Button>
      </div>
    );
  }

  const phase = ride.status;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center gap-2 border-b bg-card p-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="text-sm font-semibold">
            {phase === "accepted" || phase === "arriving"
              ? "Menjemput Penumpang"
              : phase === "in_progress"
                ? "Dalam Perjalanan"
                : phase === "completed"
                  ? "Trip Selesai"
                  : "Trip"}
          </div>
          <div className="text-xs text-muted-foreground">{ride.distance_km.toFixed(1)} km · {formatRupiah(ride.fare)}</div>
        </div>
      </div>

      <div className="relative flex-1">
        <DriverMap
          driver={pos}
          pickup={phase === "in_progress" || phase === "completed" ? null : { lat: ride.pickup_lat, lng: ride.pickup_lng }}
          dest={{ lat: ride.dest_lat, lng: ride.dest_lng }}
        />
      </div>

      <div className="space-y-3 border-t bg-card p-4">
        <Card>
          <CardContent className="space-y-2 p-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <div className="flex-1 text-sm">
                <div className="text-xs text-muted-foreground">Jemput</div>
                <div className="font-medium">{ride.pickup_name}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Navigation2 className="mt-0.5 h-4 w-4 text-accent-foreground" />
              <div className="flex-1 text-sm">
                <div className="text-xs text-muted-foreground">Tujuan</div>
                <div className="font-medium">{ride.dest_name}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {phase === "accepted" && (
          <Button size="lg" className="w-full" onClick={() => update({ status: "arriving" })}>
            Saya Menuju Pickup
          </Button>
        )}
        {phase === "arriving" && (
          <Button size="lg" className="w-full" onClick={() => update({ status: "in_progress", started_at: new Date().toISOString() })}>
            Mulai Perjalanan
          </Button>
        )}
        {phase === "in_progress" && (
          <Button size="lg" className="w-full" onClick={() => update({ status: "completed", completed_at: new Date().toISOString() })}>
            Selesaikan Trip
          </Button>
        )}
        {phase === "completed" && (
          <div className="space-y-2">
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <div className="text-xs text-muted-foreground">Pendapatan</div>
              <div className="text-3xl font-bold text-primary">{formatRupiah(ride.fare)}</div>
            </div>
            <Button size="lg" className="w-full" onClick={() => navigate("/driver")}>Kembali</Button>
          </div>
        )}
        {phase === "cancelled" && (
          <div className="space-y-2">
            <div className="rounded-lg bg-destructive/10 p-4 text-center text-destructive">Trip dibatalkan</div>
            <Button size="lg" className="w-full" onClick={() => navigate("/driver")}>Kembali</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverActiveRide;
