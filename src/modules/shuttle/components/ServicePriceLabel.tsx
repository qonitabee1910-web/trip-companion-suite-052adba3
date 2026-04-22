import { useState, useEffect } from "react";
import { calcPriceCompat } from "../lib/migrationHelper";
import { type ServiceConfig, type VehicleType } from "../data/services";
import { type Rayon } from "../data/rayons";
import { Skeleton } from "@/components/ui/skeleton";

interface ServicePriceLabelProps {
  vehicle: VehicleType | undefined | null;
  service: ServiceConfig;
  rayon: Rayon | null;
  pickupCode: string | null | undefined;
  pax?: number;
  showLabel?: boolean;
  className?: string;
}

export const ServicePriceLabel = ({
  vehicle,
  service,
  rayon,
  pickupCode,
  pax = 1,
  showLabel = false,
  className,
}: ServicePriceLabelProps) => {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicle || !rayon) return;

    setLoading(true);
    calcPriceCompat(vehicle, service, rayon, pickupCode || undefined)
      .then(setPrice)
      .catch((err) => {
        console.error("Failed to load price:", err);
      })
      .finally(() => setLoading(false));
  }, [vehicle, service, rayon, pickupCode]);

  if (loading || price === null) {
    return <Skeleton className="h-5 w-20 ml-auto" />;
  }

  const totalPrice = price * Math.max(1, pax);

  return (
    <div className="text-right shrink-0">
      {showLabel && (
        <p className="text-[10px] text-muted-foreground">total {pax} pax</p>
      )}
      <p className={className}>
        Rp{totalPrice.toLocaleString("id-ID")}
      </p>
    </div>
  );
};
