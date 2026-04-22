import { useState, useEffect } from "react";
import { Route } from "lucide-react";
import { calcFareBreakdown, type ServiceConfig, type VehicleType } from "../data/services";
import { calcFareBreakdownCompat } from "../lib/migrationHelper";
import type { Rayon } from "../data/rayons";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [breakdown, setBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fare breakdown (with OSRM support via feature flag)
  useEffect(() => {
    setLoading(true);
    setError(null);

    calcFareBreakdownCompat(vehicle, service, rayon, pickupCode)
      .then(setBreakdown)
      .catch((err) => {
        console.error("Fare calculation error:", err);
        setError(err.message);
        // Fallback to legacy calculation
        try {
          const legacy = calcFareBreakdown(vehicle, service, rayon, pickupCode);
          setBreakdown(legacy);
        } catch (e) {
          setError("Failed to calculate fare");
        }
      })
      .finally(() => setLoading(false));
  }, [vehicle, service, rayon, pickupCode]);

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (error || !breakdown) {
    return (
      <div className={cn("text-sm text-red-600", className)}>
        {error || "Tidak bisa menghitung tarif"}
      </div>
    );
  }

  const unitPrice = breakdown.total;
  const total = unitPrice * Math.max(1, pax);

  if (compact) {
    return (
      <div className={cn("text-xs space-y-0.5", className)}>
        <div className="flex justify-between text-muted-foreground">
          <span>
            {breakdown.distanceKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km × {fmt(breakdown.farePerKm)} ({service.label})
          </span>
          <span>{fmt(breakdown.distanceFare)}</span>
        </div>
        {vehicle && breakdown.basePrice > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Dasar {vehicle.label}</span>
            <span>{fmt(breakdown.basePrice)}</span>
          </div>
        )}

        {/* NEW: Show time estimate if available */}
        {breakdown.estimatedDurationMin && (
          <div className="flex justify-between text-muted-foreground">
            <span>Durasi</span>
            <span>±{breakdown.estimatedDurationMin} min</span>
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
          Jarak {breakdown.distanceKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km × {fmt(breakdown.farePerKm)} ({service.label})
        </span>
        <span>{fmt(breakdown.distanceFare)}</span>
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

      {/* NEW: Show time estimate if available */}
      {breakdown.estimatedDurationMin && (
        <div className="flex justify-between text-muted-foreground">
          <span>Estimasi Durasi</span>
          <span>±{breakdown.estimatedDurationMin} menit</span>
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

      {/* Audit Trail & Edge Cases Info */}
      {breakdown.auditTrail && (
        <div className="mt-2 space-y-1">
          {breakdown.auditTrail.isMinimumFareApplied && (
            <div className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
              * Tarif minimum Rp50.000 berlaku
            </div>
          )}
          {breakdown.auditTrail.isMaxDistanceExceeded && (
            <div className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
              * Jarak melebihi batas 500km, tarif dibatasi
            </div>
          )}
        </div>
      )}

      {/* NEW: Debug info for development */}
      {process.env.NODE_ENV === "development" && breakdown.routingSource && (
        <div className="text-[10px] text-muted-foreground/50 border-t pt-1 mt-1 flex justify-between items-center">
          <span>Sumber: {breakdown.routingSource}</span>
          {breakdown.auditTrail && (
            <button 
              onClick={() => console.table(breakdown.auditTrail)}
              className="hover:text-primary underline"
            >
              Log Audit
            </button>
          )}
        </div>
      )}
    </div>
  );
};
