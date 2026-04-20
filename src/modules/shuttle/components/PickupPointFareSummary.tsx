/**
 * PickupPointFareSummary - Display fare for selected pickup point
 * Shows distance and fare breakdown with comparison to first pickup
 */

import { MapPin } from "lucide-react";
import { getRemainingDistanceM, getTotalDistanceM, type Rayon } from "../data/rayons";
import { calcFareBreakdown, type ServiceConfig, type VehicleType } from "../data/services";
import { cn } from "@/lib/utils";

interface PickupPointFareSummaryProps {
  vehicle: VehicleType | null | undefined;
  service: ServiceConfig;
  rayon?: Rayon | null;
  pickupCode?: string;
  compact?: boolean;
  className?: string;
}

const fmt = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export const PickupPointFareSummary = ({
  vehicle,
  service,
  rayon,
  pickupCode,
  compact = false,
  className,
}: PickupPointFareSummaryProps) => {
  if (!rayon || !pickupCode) return null;

  const pickup = rayon.pickupPoints?.find((p) => p.code === pickupCode);
  if (!pickup) return null;

  const breakdown = calcFareBreakdown(vehicle, service, rayon, pickupCode);

  // Only show if perPickupFare is enabled OR distance differs from total
  const totalDist = getTotalDistanceM(rayon);
  if (!rayon.perPickupFare && breakdown.distanceM === totalDist) {
    return null;
  }

  // Calculate fare from first pickup for comparison
  const firstPickup = rayon.pickupPoints?.find((p) => p.code !== "DEST");
  const firstBreakdown =
    firstPickup && firstPickup.code !== pickupCode
      ? calcFareBreakdown(vehicle, service, rayon, firstPickup.code)
      : null;

  const fareDiff =
    firstBreakdown && breakdown.total !== firstBreakdown.total
      ? breakdown.total - firstBreakdown.total
      : 0;

  const isHigher = fareDiff > 0;
  const isDifferent = Math.abs(fareDiff) > 0;

  if (compact) {
    return (
      <div className={cn("text-xs space-y-1 bg-muted/50 rounded-lg p-2", className)}>
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground">{pickup.name}</p>
            <p className="text-muted-foreground">
              {breakdown.distanceKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km tersisa
            </p>
            {isDifferent && firstBreakdown && (
              <p
                className={cn(
                  "text-[10px] font-medium",
                  isHigher ? "text-destructive" : "text-success",
                )}
              >
                {isHigher ? "+" : "-"}
                {fmt(Math.abs(fareDiff))} vs titik pertama
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-accent">{fmt(breakdown.total)}</p>
            <p className="text-[10px] text-muted-foreground">per kursi</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2 text-xs border rounded-lg p-3 bg-card",
        rayon.perPickupFare ? "border-primary/20 bg-primary/5" : "border-border",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="font-semibold">Titik Jemput: {pickup.name}</span>
        {rayon.perPickupFare && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Per Titik
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <div>
          <p className="text-[10px]">Jarak ke tujuan</p>
          <p className="font-semibold text-foreground">
            {breakdown.distanceKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px]">Fare per kursi</p>
          <p className="font-semibold text-accent">{fmt(breakdown.total)}</p>
        </div>
      </div>

      {isDifferent && firstBreakdown && (
        <div
          className={cn(
            "p-2 rounded text-[10px] font-medium",
            isHigher
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {isHigher ? "Lebih mahal" : "Lebih murah"} {fmt(Math.abs(fareDiff))} dari {firstPickup?.name}
        </div>
      )}
    </div>
  );
};

export default PickupPointFareSummary;
