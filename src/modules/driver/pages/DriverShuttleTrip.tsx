import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bus, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SEED_RAYONS_PYUGO } from "@/modules/shuttle/data/rayons";

interface ShuttleTrip {
  id: string;
  driver_id: string | null;
  rayon_id: string;
  vehicle_id: string | null;
  service_tier: string;
  depart_at: string;
  status: "scheduled" | "boarding" | "in_progress" | "completed" | "cancelled";
  current_pickup_index: number;
}

const DriverShuttleList = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<ShuttleTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/driver/login");
        return;
      }
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from("shuttle_trips")
        .select("*")
        .eq("driver_id", sess.session.user.id)
        .gte("depart_at", start.toISOString())
        .lte("depart_at", end.toISOString())
        .order("depart_at");
      setTrips((data as ShuttleTrip[]) ?? []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-2 border-b bg-card p-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold">Shuttle Trip Hari Ini</div>
      </div>
      <div className="space-y-3 p-4">
        {loading && <div className="text-center text-muted-foreground">Memuat…</div>}
        {!loading && trips.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Bus className="mx-auto mb-2 h-8 w-8" />
              Tidak ada trip terjadwal hari ini.
            </CardContent>
          </Card>
        )}
        {trips.map((t) => {
          const rayon = SEED_RAYONS_PYUGO.find((r) => r.id === t.rayon_id);
          return (
            <Card key={t.id} onClick={() => navigate(`/driver/shuttle/${t.id}`)} className="cursor-pointer hover:bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{rayon?.name ?? t.rayon_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.depart_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · {t.service_tier}
                    </div>
                  </div>
                  <div className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t.status}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const DriverShuttleTripDetail = ({ tripId }: { tripId: string }) => {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<ShuttleTrip | null>(null);

  const load = async () => {
    const { data } = await supabase.from("shuttle_trips").select("*").eq("id", tripId).maybeSingle();
    setTrip((data as ShuttleTrip) ?? null);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`trip-${tripId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shuttle_trips", filter: `id=eq.${tripId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tripId]);

  if (!trip) return <div className="flex min-h-screen items-center justify-center">Memuat…</div>;

  const rayon = SEED_RAYONS_PYUGO.find((r) => r.id === trip.rayon_id);
  const points = rayon?.pickupPoints ?? [];
  const idx = trip.current_pickup_index;
  const isLast = idx >= points.length - 1;

  const advance = async () => {
    const nextIdx = idx + 1;
    const completing = nextIdx >= points.length;
    const patch: any = completing
      ? { status: "completed", current_pickup_index: idx }
      : { current_pickup_index: nextIdx, status: "in_progress" };
    const { error } = await supabase.from("shuttle_trips").update(patch).eq("id", tripId);
    if (error) toast({ title: "Gagal", description: error.message, variant: "destructive" });
  };

  const start = async () => {
    await supabase.from("shuttle_trips").update({ status: "in_progress" }).eq("id", tripId);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-2 border-b bg-card p-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/shuttle")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="font-semibold">{rayon?.name}</div>
          <div className="text-xs text-muted-foreground">{trip.service_tier} · status: {trip.status}</div>
        </div>
      </div>

      <div className="space-y-2 p-4">
        {trip.status === "scheduled" && (
          <Button size="lg" className="w-full" onClick={start}>Mulai Trip</Button>
        )}
        {points.map((p, i) => {
          const done = i < idx || trip.status === "completed";
          const current = i === idx && trip.status !== "completed";
          return (
            <Card key={p.code} className={current ? "border-primary" : done ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-3 p-3">
                {done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <MapPin className="h-5 w-5 text-muted-foreground" />}
                <div className="flex-1">
                  <div className="font-medium">{p.code} · {p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.time}</div>
                </div>
                {current && trip.status === "in_progress" && (
                  <Button size="sm" onClick={advance}>{isLast ? "Selesai Trip" : "Berangkat ke titik berikutnya"}</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {trip.status === "completed" && (
          <Button variant="outline" className="w-full" onClick={() => navigate("/driver/shuttle")}>Kembali</Button>
        )}
      </div>
    </div>
  );
};

const DriverShuttleTrip = () => {
  const { id } = useParams<{ id: string }>();
  if (id) return <DriverShuttleTripDetail tripId={id} />;
  return <DriverShuttleList />;
};

export default DriverShuttleTrip;
