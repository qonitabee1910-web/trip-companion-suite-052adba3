import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnlineToggle } from "../components/OnlineToggle";
import { DriverMap } from "../components/DriverMap";
import { IncomingRideSheet } from "../components/IncomingRideSheet";
import { useDriverLocation } from "../hooks/useDriverLocation";
import { useIncomingRides } from "../hooks/useIncomingRides";
import { useDriverActiveRide } from "../hooks/useActiveRide";
import { toast } from "@/hooks/use-toast";
import { Bus, LogOut, Star, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/shared/auth/useAuth";
import { NotificationBell } from "@/shared/components/NotificationBell";
import type { DriverRow, Ride } from "../data/driver";
import { formatRupiah } from "../data/driver";

const DriverHome = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const userId = user?.id ?? null;
  const profileName = profile?.full_name ?? "Driver";
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const activeRide = useDriverActiveRide(userId);

  // Bootstrap driver row + today stats (RequireAuth already guards role + verification)
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      // ensure driver row exists
      const { data: drv } = await supabase.from("drivers").select("*").eq("id", userId).maybeSingle();
      if (!mounted) return;
      if (!drv) {
        const { data: created } = await supabase
          .from("drivers")
          .insert({ id: userId, vehicle_type: "car", plate: "—" })
          .select()
          .single();
        if (mounted) setDriver(created as DriverRow);
      } else {
        setDriver(drv as DriverRow);
      }

      // today stats
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data: rides } = await supabase
        .from("rides")
        .select("fare")
        .eq("driver_id", userId)
        .eq("status", "completed")
        .gte("completed_at", start.toISOString());
      if (mounted && rides) {
        setTodayCount(rides.length);
        setTodayEarnings(rides.reduce((s, r: any) => s + (r.fare ?? 0), 0));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // location
  useDriverLocation({
    driverId: userId,
    enabled: !!driver?.is_online,
    fast: activeRide?.status === "in_progress",
  });

  // mirror lastPosition periodically into local state for UI/map
  useEffect(() => {
    if (!driver?.is_online) return;
    const t = window.setInterval(() => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => {},
          { maximumAge: 4000, timeout: 5000 },
        );
      }
    }, 4000);
    return () => window.clearInterval(t);
  }, [driver?.is_online]);

  const { pending } = useIncomingRides({
    enabled: !!driver?.is_online && !activeRide,
    driverPos: pos,
    maxKm: 5,
  });

  const incoming = pending[0] ?? null;

  // Auto-redirect when active ride present
  useEffect(() => {
    if (activeRide) navigate(`/driver/ride/${activeRide.id}`);
  }, [activeRide?.id]);

  const toggleOnline = async (next: boolean) => {
    if (!driver) return;
    const { error } = await supabase.from("drivers").update({ is_online: next }).eq("id", driver.id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return;
    }
    setDriver({ ...driver, is_online: next });
    toast({ title: next ? "Online" : "Offline" });
  };

  const accept = async (ride: Ride) => {
    if (!userId) return;
    const { error } = await supabase
      .from("rides")
      .update({ status: "accepted", driver_id: userId, accepted_at: new Date().toISOString() })
      .eq("id", ride.id)
      .eq("status", "pending");
    if (error) {
      toast({ title: "Gagal terima", description: error.message, variant: "destructive" });
      return;
    }
    navigate(`/driver/ride/${ride.id}`);
  };

  const reject = async (_ride: Ride) => {
    // local dismiss; ride remains pending for other drivers
  };

  const logout = async () => {
    if (driver?.is_online) await supabase.from("drivers").update({ is_online: false }).eq("id", driver.id);
    await supabase.auth.signOut();
    navigate("/auth?role=driver", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* header */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <button onClick={() => navigate("/driver/profile")} className="flex items-center gap-3 text-left">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.photo_url ?? undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-xs text-muted-foreground">Selamat datang</div>
            <div className="flex items-center gap-2 font-semibold">
              {profileName}
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-current text-yellow-500" />
                {driver?.rating?.toFixed(2) ?? "5.00"}
              </span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* map */}
      <div className="relative flex-1">
        <DriverMap driver={pos} />
        {driver?.is_online && !incoming && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-lg">
            Menunggu request…
          </div>
        )}
      </div>

      {/* bottom panel */}
      <div className="space-y-3 border-t bg-card p-4">
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Trip hari ini</div>
              <div className="text-2xl font-bold">{todayCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Pendapatan</div>
              <div className="text-lg font-bold text-primary">{formatRupiah(todayEarnings)}</div>
            </CardContent>
          </Card>
        </div>
        <OnlineToggle online={!!driver?.is_online} onChange={toggleOnline} disabled={!driver} />
        <Button variant="outline" className="w-full" onClick={() => navigate("/driver/shuttle")}>
          <Bus className="mr-2 h-4 w-4" /> Shuttle Trip Hari Ini
        </Button>
      </div>

      <IncomingRideSheet ride={incoming} driverPos={pos} onAccept={accept} onReject={reject} />
    </div>
  );
};

export default DriverHome;
