import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, startOfToday } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getRayon, getDestination, getContent, getTotalDistanceM, getShiftedSchedule } from "../data/rayons";
import { getDepartTimes, getServicesAll } from "../data/repository";
import { StepperHeader } from "@/shared/components/StepperHeader";
import { RayonRouteMap } from "../components/RayonRouteMap";
import { MapPin, Plane, Users, Minus, Plus, Clock, Calendar as CalendarIcon, Route } from "lucide-react";

const ShuttleRayon = () => {
  const { id = "A" } = useParams();
  const navigate = useNavigate();
  const rayon = getRayon(id);
  const DEPART_TIMES = getDepartTimes();
  const DESTINATION = getDestination();
  const content = getContent();
  const activeServices = getServicesAll().filter((s) => s.active !== false);
  const pickupOptions = (rayon?.pickupPoints || []).filter((p) => p.code !== "DEST");
  const [pickup, setPickup] = useState(pickupOptions[0]?.code || "");
  const [date, setDate] = useState<Date>(startOfToday());
  const [time, setTime] = useState(DEPART_TIMES[1] ?? DEPART_TIMES[0] ?? "06:00");
  const [pax, setPax] = useState(1);

  if (!rayon) {
    return (
      <ResponsiveLayout mobileTitle="Rayon" mobileBack="/shuttle">
        <div className="container py-10 text-center text-muted-foreground">Rayon tidak ditemukan.</div>
      </ResponsiveLayout>
    );
  }

  const totalKm = getTotalDistanceM(rayon) / 1000;
  const shifted = getShiftedSchedule(rayon, time);
  const arriveTime = shifted.get("DEST") || rayon.pickupPoints[rayon.pickupPoints.length - 1]?.time || "";

  const handleNext = () => {
    const params = new URLSearchParams({
      rayon: rayon.id,
      pickup,
      date: format(date, "yyyy-MM-dd"),
      time,
      pax: String(pax),
    });
    if (activeServices.length === 1) {
      params.set("service", activeServices[0].tier);
      navigate(`/shuttle/vehicle?${params.toString()}`);
      return;
    }
    navigate(`/shuttle/service?${params.toString()}`);
  };

  return (
    <ResponsiveLayout
      mobileTitle={`${rayon.name} → ${DESTINATION.short}`}
      mobileBack="/shuttle"
      mobileSubtitle={rayon.area}
      hideBottomNav
      mobileHeaderVariant="plain"
    >
      <div className="container max-w-2xl py-4 md:py-8 px-3 md:px-6 space-y-4">
        <StepperHeader current="schedule" />
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Badge variant="secondary" className="mb-1">{rayon.name}</Badge>
              <h2 className="font-bold text-lg">{rayon.area}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tujuan</p>
              <div className="flex items-center gap-1.5 font-semibold">
                <Plane className="h-4 w-4 text-accent" />
                {DESTINATION.short}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tiba ±{arriveTime}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> ±{rayon.estimateMin} menit
            </span>
            <span className="flex items-center gap-1">
              <Route className="h-3.5 w-3.5" /> ±{totalKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {pickupOptions.length} titik jemput
            </span>
          </div>
        </Card>

        <Card className="p-3 md:p-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" /> Rute Perjalanan
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Tap titik di peta untuk memilih
            </span>
          </div>
          <RayonRouteMap
            rayon={rayon}
            selectedCode={pickup}
            onSelect={setPickup}
            shiftedTimes={shifted}
            height="300px"
          />
        </Card>

        <Card className="p-4 md:p-5 space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Titik Jemput
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pickupOptions.map((p) => {
                const active = pickup === p.code;
                return (
                  <button
                    key={p.code}
                    onClick={() => setPickup(p.code)}
                    className={`px-3 py-2 rounded-lg text-left text-sm border-2 transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium leading-tight truncate">{p.name}</div>
                    <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      <Clock className="h-2.5 w-2.5" /> {p.time || "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Tanggal Berangkat
            </h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "EEEE, d MMM yyyy", { locale: localeId })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d < startOfToday()}
                  initialFocus
                  locale={localeId}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Jam Berangkat
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DEPART_TIMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`py-2 rounded-md text-sm font-medium border-2 transition-all ${
                    time === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Jumlah Penumpang
            </h3>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setPax(Math.max(1, pax - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-lg font-bold">{pax}</span>
              <Button variant="outline" size="icon" onClick={() => setPax(Math.min(content.paxMax, pax + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-1">max {content.paxMax}</span>
            </div>
          </div>
        </Card>

        <Button
          onClick={handleNext}
          className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
        >
          Lihat Pilihan Service
        </Button>
      </div>
    </ResponsiveLayout>
  );
};

export default ShuttleRayon;
