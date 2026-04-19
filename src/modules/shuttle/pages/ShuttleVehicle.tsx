import { useNavigate, useSearchParams } from "react-router-dom";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, Bus, Car, Caravan } from "lucide-react";
import { calcPrice, getService, getVehicleSeatCount } from "../data/services";
import { getRayon, getDestination } from "../data/rayons";
import { getServicesAll, getVehicleTypesAll } from "../data/repository";
import { getAvailableCount } from "../data/inventory";
import { StepperHeader } from "@/shared/components/StepperHeader";
import hiaceImg from "@/assets/shuttle/base-hiace.png";

const vehicleIcon = { hiace: Bus, suv: Car, minicar: Caravan } as const;

const ShuttleVehicle = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rayon = getRayon(params.get("rayon") || "A");
  const DESTINATION = getDestination();
  const SERVICES = getServicesAll();
  const VEHICLE_TYPES = getVehicleTypesAll().filter((v) => v.active !== false);
  const service = getService(params.get("service") || "reguler") || SERVICES[0];
  const pax = Number(params.get("pax") || 1);
  const date = params.get("date") || "";
  const time = params.get("time") || "";
  const rayonId = params.get("rayon") || "A";

  const handlePick = (vehicleId: string) => {
    const next = new URLSearchParams(params);
    next.set("vehicle", vehicleId);
    navigate(`/shuttle/book?${next.toString()}`);
  };

  return (
    <ResponsiveLayout
      mobileTitle="Pilih Kendaraan"
      mobileBack={`/shuttle/service?${params.toString()}`}
      mobileSubtitle={`${service.label} • ${rayon?.name} → ${DESTINATION.short}`}
      hideBottomNav
      mobileHeaderVariant="plain"
    >
      <div className="container max-w-2xl py-4 md:py-8 px-3 md:px-6 space-y-3">
        <StepperHeader current="vehicle" />
        <Card className="p-3 bg-muted/40 border-dashed">
          <p className="text-xs text-muted-foreground">
            Service: <span className="font-semibold text-foreground">{service.label}</span> • Penumpang:{" "}
            <span className="font-semibold text-foreground">{pax} orang</span>
          </p>
        </Card>

        {VEHICLE_TYPES.length === 0 && (
          <Card className="p-4 text-sm text-muted-foreground">Belum ada kendaraan aktif.</Card>
        )}

        {VEHICLE_TYPES.map((v) => {
          const Icon = vehicleIcon[v.id];
          const total = calcPrice(v, service, rayon) * pax;
          const capacity = getVehicleSeatCount(v.id, service.tier);
          const seatsLeft = getAvailableCount(
            { date, time, rayonId, vehicleId: v.id, tier: service.tier },
            capacity,
          );
          const lowSeats = capacity > 0 && seatsLeft / capacity < 0.3;
          const notEnough = seatsLeft < pax;

          return (
            <Card key={v.id} className="p-4 md:p-5 hover:shadow-card transition-all">
              <div className="flex gap-3 md:gap-4">
                <div className="h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden">
                  {v.id === "hiace" ? (
                    <img src={hiaceImg} alt={v.label} className="h-full w-full object-contain p-1" />
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold truncate">{v.label}</h3>
                      <p className="text-xs text-muted-foreground truncate">{v.vehicleName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">total {pax} pax</p>
                      <p className="font-bold text-accent">Rp{total.toLocaleString("id-ID")}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      <Users className="h-3 w-3 mr-1" /> {capacity} kursi
                    </Badge>
                    <Badge
                      variant={lowSeats ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {lowSeats && <AlertTriangle className="h-3 w-3 mr-1" />}
                      Sisa {seatsLeft}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handlePick(v.id)}
                disabled={notEnough}
                className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {notEnough ? "Kursi tidak cukup" : "Pilih Kursi"}
              </Button>
            </Card>
          );
        })}
      </div>
    </ResponsiveLayout>
  );
};

export default ShuttleVehicle;
