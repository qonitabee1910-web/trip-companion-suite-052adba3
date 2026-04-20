import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, Sparkles, Crown, Gauge, Info } from "lucide-react";
import { calcPrice, getVehicleTierPrice } from "../data/services";
import { getRayon, getDestination } from "../data/rayons";
import { getServicesAll, getVehicleTypesAll } from "../data/repository";
import { StepperHeader } from "@/shared/components/StepperHeader";
import { FareBreakdownCard } from "../components/FareBreakdownCard";
import { useCloudSnapshot } from "../hooks/useCloudSnapshot";

const tierIcon = {
  reguler: Gauge,
  "semi-executive": Sparkles,
  executive: Crown,
} as const;

const ShuttleService = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rayon = getRayon(params.get("rayon") || "A");
  const DESTINATION = getDestination();
  const SERVICES = getServicesAll().filter((s) => s.active !== false);
  const VEHICLE_TYPES = getVehicleTypesAll().filter((v) => v.active !== false);

  // Cheapest vehicle dihitung per service tier (untuk label "mulai dari").

  // Auto-skip if only one service active
  useEffect(() => {
    if (SERVICES.length === 1) {
      const next = new URLSearchParams(params);
      next.set("service", SERVICES[0].tier);
      navigate(`/shuttle/vehicle?${next.toString()}`, { replace: true });
    }
  }, [SERVICES.length, navigate, params]);

  const handlePick = (tier: string) => {
    const next = new URLSearchParams(params);
    next.set("service", tier);
    // Auto-skip vehicle if only 1 active
    if (VEHICLE_TYPES.length === 1) {
      next.set("vehicle", VEHICLE_TYPES[0].id);
      navigate(`/shuttle/book?${next.toString()}`);
      return;
    }
    navigate(`/shuttle/vehicle?${next.toString()}`);
  };

  return (
    <ResponsiveLayout
      mobileTitle="Pilih Service"
      mobileBack={`/shuttle/rayon/${rayon?.id || "A"}`}
      mobileSubtitle={`${rayon?.name} → ${DESTINATION.short}`}
      hideBottomNav
      mobileHeaderVariant="plain"
    >
      <div className="container max-w-2xl py-4 md:py-8 px-3 md:px-6 space-y-3">
        <StepperHeader current="service" />
        <p className="text-sm text-muted-foreground px-1">
          Pilih kelas layanan sesuai kebutuhan perjalananmu ke {DESTINATION.short}.
        </p>

        {SERVICES.length === 0 && (
          <Card className="p-4 text-sm text-muted-foreground">Belum ada service aktif.</Card>
        )}

        {SERVICES.map((s) => {
          const Icon = tierIcon[s.tier] ?? Gauge;
          const cheapestForTier = VEHICLE_TYPES.reduce<typeof VEHICLE_TYPES[number] | undefined>(
            (min, v) => {
              const p = getVehicleTierPrice(v, s.tier);
              if (!min) return v;
              return p < getVehicleTierPrice(min, s.tier) ? v : min;
            },
            undefined,
          );
          const startPrice = cheapestForTier ? calcPrice(cheapestForTier, s, rayon) : 0;
          const isExec = s.tier === "executive";
          return (
            <Card
              key={s.tier}
              className={`p-4 md:p-5 transition-all hover:shadow-card ${isExec ? "border-accent/40 bg-gradient-to-br from-accent/5 to-transparent" : ""}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      isExec ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{s.label}</h3>
                      {isExec && <Badge className="bg-accent text-accent-foreground">Premium</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">mulai</p>
                  <p className="font-bold text-accent">Rp{startPrice.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <ul className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-muted-foreground mb-4">
                {s.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span className="truncate">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handlePick(s.tier)}
                className={`w-full ${isExec ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`}
                variant={isExec ? "default" : "outline"}
              >
                Pilih {s.label}
              </Button>
            </Card>
          );
        })}
      </div>
    </ResponsiveLayout>
  );
};

export default ShuttleService;
