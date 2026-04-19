import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation2, Clock } from "lucide-react";
import type { Ride } from "../data/driver";
import { distanceTo, formatRupiah } from "../data/driver";

interface Props {
  ride: Ride | null;
  driverPos: { lat: number; lng: number } | null;
  onAccept: (ride: Ride) => void;
  onReject: (ride: Ride) => void;
}

const AUTO_REJECT_SEC = 15;

export const IncomingRideSheet = ({ ride, driverPos, onAccept, onReject }: Props) => {
  const [seconds, setSeconds] = useState(AUTO_REJECT_SEC);

  useEffect(() => {
    if (!ride) return;
    setSeconds(AUTO_REJECT_SEC);
    const t = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          onReject(ride);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [ride?.id]);

  if (!ride) return null;

  const distToPickup = driverPos ? distanceTo(driverPos, { lat: ride.pickup_lat, lng: ride.pickup_lng }) : null;

  return (
    <Drawer open={!!ride} dismissible={false}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>Request Baru</span>
            <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Clock className="h-4 w-4" />
              {seconds}s
            </span>
          </DrawerTitle>
          <DrawerDescription>{ride.ride_type.toUpperCase()} · {ride.distance_km.toFixed(1)} km</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-3 px-4 pb-2">
          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Jemput</div>
              <div className="font-medium">{ride.pickup_name}</div>
              {distToPickup !== null && (
                <div className="text-xs text-muted-foreground">{distToPickup.toFixed(1)} km dari Anda</div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <Navigation2 className="mt-0.5 h-5 w-5 text-accent-foreground" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Tujuan</div>
              <div className="font-medium">{ride.dest_name}</div>
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">Pendapatan</div>
            <div className="text-2xl font-bold text-primary">{formatRupiah(ride.fare)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4">
          <Button variant="outline" size="lg" onClick={() => onReject(ride)}>Tolak</Button>
          <Button size="lg" onClick={() => onAccept(ride)}>Terima</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
