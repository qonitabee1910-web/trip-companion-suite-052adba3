import { useNavigate } from "react-router-dom";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, MapPin, ArrowRight, Ticket } from "lucide-react";
import { getRayons, getDestinationStored, getContentStored } from "../data/repository";

const rayonAccent: Record<string, string> = {
  A: "from-primary/15 to-primary/5 border-primary/30 text-primary",
  B: "from-accent/15 to-accent/5 border-accent/30 text-accent",
  C: "from-success/15 to-success/5 border-success/30 text-success",
  D: "from-warning/15 to-warning/5 border-warning/30 text-warning",
};

const ShuttleHome = () => {
  const navigate = useNavigate();
  const RAYONS = getRayons();
  const DESTINATION = getDestinationStored();
  const content = getContentStored();

  return (
    <ResponsiveLayout
      mobileTitle={content.heroTitle}
      mobileBack="/"
      mobileSubtitle={content.heroSubtitle}
      mobileHeaderRight={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/shuttle/my-bookings")}
          className="text-primary-foreground hover:bg-white/10 gap-1"
        >
          <Ticket className="h-4 w-4" /> Tiket
        </Button>
      }
    >
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container py-6 md:py-10 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs md:text-sm text-white/80 mb-2">
              <MapPin className="h-3.5 w-3.5" /> Tujuan tetap
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/shuttle/my-bookings")}
              className="hidden md:inline-flex gap-1.5"
            >
              <Ticket className="h-4 w-4" /> Riwayat Tiket
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-white/15 flex items-center justify-center">
              <Plane className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold leading-tight">{DESTINATION.short}</h1>
              <p className="text-xs md:text-sm text-white/85">{DESTINATION.name}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container px-3 md:px-6 py-5 md:py-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="font-bold text-base md:text-lg">Pilih Rayon Keberangkatan</h2>
            <p className="text-xs text-muted-foreground">Setiap rayon punya titik jemput berbeda</p>
          </div>
          <Badge variant="secondary">{RAYONS.length} Rayon</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {RAYONS.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/shuttle/rayon/${r.id}`)}
              className={`text-left rounded-xl border-2 bg-gradient-to-br p-4 transition-all hover:shadow-card hover:-translate-y-0.5 ${rayonAccent[r.id] ?? "from-muted to-muted/30 border-border text-foreground"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-black">{r.id}</span>
                <ArrowRight className="h-4 w-4 opacity-70" />
              </div>
              <p className="font-bold text-foreground text-sm">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.area}</p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {r.pickupPoints.length} titik jemput
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="container px-3 md:px-6 pb-8">
        <Card className="p-4 bg-muted/30 border-dashed">
          <p className="text-xs text-muted-foreground leading-relaxed">{content.footerNote}</p>
        </Card>
      </section>
    </ResponsiveLayout>
  );
};

export default ShuttleHome;
