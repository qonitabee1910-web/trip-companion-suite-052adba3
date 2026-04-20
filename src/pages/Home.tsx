import { Link } from "react-router-dom";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { ModuleCard } from "@/shared/components/ModuleCard";
import { HeadBanner } from "@/shared/components/HeadBanner";
import { MODULES } from "@/shared/modules";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Bell, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEFAULT_HERO_BANNERS } from "@/shared/data/heroBanners";

const recommendations = [
  { id: 1, name: "Bali Sunset Resort", location: "Seminyak, Bali", price: 850000, rating: 4.8, img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600" },
  { id: 2, name: "Yogya Heritage Hotel", location: "Malioboro, Yogyakarta", price: 420000, rating: 4.6, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600" },
  { id: 3, name: "Bandung Highland Inn", location: "Lembang, Bandung", price: 560000, rating: 4.7, img: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600" },
  { id: 4, name: "Jakarta Skyline Suite", location: "Sudirman, Jakarta", price: 1250000, rating: 4.9, img: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600" },
];

const Home = () => {
  const isMobile = useIsMobile();
  const enabledModules = MODULES;

  return (
    <ResponsiveLayout hideMobileHeader hideWebHeader>
      {/* Unified PYU-GO hero banner */}
      <HeadBanner
        variant="hero"
        title={isMobile ? "Hai, mau ke mana hari ini?" : "Jalan-jalan, antar-jemput, sampai pesan kendaraan — semua dari PYU-GO."}
        subtitle={isMobile ? undefined : "Cari penginapan, tiket shuttle antar kota, atau pesan kendaraan instan — dalam satu aplikasi."}
        rightSlot={isMobile ? <Bell className="h-5 w-5" /> : undefined}
      >
      </HeadBanner>

      {/* Mobile search bar (separate band so banner stays clean) */}
      {isMobile && (
        <div className="bg-gradient-hero px-4 pb-6 -mt-2">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-foreground">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Cari hotel, shuttle, tujuan..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* Modules grid */}
      <section className={isMobile ? "px-3 -mt-4" : "container -mt-10"}>
        <Card className="shadow-elevated">
          <div className={`p-4 md:p-6 grid gap-4 ${isMobile ? "grid-cols-4" : "grid-cols-4 md:grid-cols-8"}`}>
            {enabledModules.map((m) => (
              <div key={m.id} className={!m.enabled ? "opacity-50 pointer-events-none" : ""}>
                <ModuleCard icon={m.icon} label={m.label} path={m.path} color={m.color} compact={isMobile} />
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Promo */}
      <section className={isMobile ? "px-3 mt-6" : "container mt-10"}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-xl font-bold">Promo Spesial</h2>
          <button className="text-sm font-medium text-primary">Lihat semua</button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 md:grid md:grid-cols-3">
          {promos.map((p) => (
            <Card key={p.id} className="min-w-[280px] md:min-w-0 bg-gradient-promo text-white border-0 shadow-card">
              <div className="p-5">
                <span className="inline-block bg-white/25 backdrop-blur text-xs font-bold px-2 py-1 rounded">{p.tag}</span>
                <h3 className="mt-3 text-lg font-bold leading-tight">{p.title}</h3>
                <p className="mt-1 text-sm text-white/90">{p.subtitle}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section className={isMobile ? "px-3 mt-6 pb-8" : "container mt-10 pb-12"}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-xl font-bold">Rekomendasi Hotel</h2>
          <button className="text-sm font-medium text-primary">Lihat semua</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {recommendations.map((r) => (
            <Card key={r.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                <img src={r.img} alt={r.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold line-clamp-1">{r.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.location}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">
                    Rp{r.price.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs font-medium text-warning">★ {r.rating}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="container pb-8 flex justify-center">
        <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
          <Link to="/admin">
            <Shield className="h-3.5 w-3.5" /> Admin Dashboard
          </Link>
        </Button>
      </div>
    </ResponsiveLayout>
  );
};

export default Home;
