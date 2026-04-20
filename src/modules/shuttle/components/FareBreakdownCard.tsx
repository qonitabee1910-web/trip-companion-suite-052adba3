import { Route } from "lucide-react";
import { calcFareBreakdown, type ServiceConfig, type VehicleType } from "../data/services";
import type { Rayon } from "../data/rayons";
import { cn } from "@/lib/utils";

interface FareBreakdownCardProps {
  vehicle: VehicleType | null | undefined;
  service: ServiceConfig;
  rayon?: Rayon | null;
  pickupCode?: string;
  pax?: number;
  /** Mode ringkas — hanya tampil per-kursi & total. */
  compact?: boolean;
  className?: string;
}

const fmt = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export const FareBreakdownCard = ({
  vehicle,
  service,
  rayon,
  pickupCode,
  pax = 1,
  compact = false,
  className,
}: FareBreakdownCardProps) => {
  const breakdown = calcFareBreakdown(vehicle, service, rayon, pickupCode);
  const unitPrice = breakdown.total;
  const total = unitPrice * Math.max(1, pax);

  if (compact) {
    return (
      <div className={cn("text-xs space-y-0.5", className)}>
        <div className="flex justify-between text-muted-foreground">
          <span>
            {breakdown.distanceKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km × {fmt(breakdown.farePerKm)}
          </span>
          <span>{fmt(breakdown.distanceFare)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>×{breakdown.multiplier} {service.label}</span>
          <span>{fmt(breakdown.serviceFare)}</span>
        </div>
        {vehicle && breakdown.basePrice > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Dasar {vehicle.label}</span>
            <span>{fmt(breakdown.basePrice)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t font-semibold">
          <span>Per kursi</span>
          <span className="text-accent">{fmt(unitPrice)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1 text-xs", className)}>
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        <Route className="h-3 w-3" />
        <span>Rincian tarif</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Jarak {breakdown.distanceKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km × {fmt(breakdown.farePerKm)}
        </span>
        <span>{fmt(breakdown.distanceFare)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Multiplier {service.label} ×{breakdown.multiplier}
        </span>
        <span>{fmt(breakdown.serviceFare)}</span>
      </div>
      {vehicle && breakdown.basePrice > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Harga dasar {vehicle.label}</span>
          <span>{fmt(breakdown.basePrice)}</span>
        </div>
      )}
      {breakdown.surcharge > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Surcharge</span>
          <span>+{fmt(breakdown.surcharge)}</span>
        </div>
      )}
      <div className="flex justify-between pt-1 border-t">
        <span className="text-muted-foreground">Per kursi</span>
        <span className="font-medium">{fmt(unitPrice)}</span>
      </div>
      {pax > 1 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">× {pax} pax</span>
          <span className="font-bold text-accent">{fmt(total)}</span>
        </div>
      )}
    </div>
  );
};
