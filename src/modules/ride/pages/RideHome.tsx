import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, MapPin, Search, Bike, Car, Users, Star, Phone, MessageCircle, X, CheckCircle2, Radio } from "lucide-react";
import { POIS, RIDE_OPTIONS, DRIVERS, DEFAULT_LOCATION, distanceKm } from "../data/ride";
import type { POI, RideOption } from "../data/ride";
import { useLiveDriverPosition, findNearestOnlineDriver } from "../hooks/useLiveDriverPosition";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(202 99% 48%);width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const destIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(16 100% 56%);width:18px;height:18px;border-radius:4px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const driverIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(215 28% 17%);color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap">🚗 Driver</div>`,
  iconSize: [60, 24], iconAnchor: [30, 12],
});

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [points, map]);
  return null;
};

const iconMap: Record<string, any> = { bike: Bike, car: Car, carxl: Users };

type Stage = "search" | "select" | "finding" | "matched" | "trip" | "done";

const RideHome = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("search");
  const [pickup, setPickup] = useState<POI | null>(null);
  const [dest, setDest] = useState<POI | null>(null);
  const [activeField, setActiveField] = useState<"pickup" | "dest" | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
  const [driver] = useState(() => DRIVERS[Math.floor(Math.random() * DRIVERS.length)]);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [liveDriverId, setLiveDriverId] = useState<string | null>(null);
  const livePos = useLiveDriverPosition(liveDriverId);
  const isLive = !!livePos;

  const distance = pickup && dest ? distanceKm(pickup, dest) : 0;

  // Saat masuk stage finding/matched, coba cari driver online di Supabase.
  // Kalau ada → pakai posisi realtime; kalau tidak → fallback animasi mock.
  useEffect(() => {
    if (stage !== "finding" || !pickup) return;
    let cancelled = false;
    findNearestOnlineDriver(pickup).then((id) => {
      if (!cancelled) setLiveDriverId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [stage, pickup]);

  // Sinkronkan posisi live ke marker
  useEffect(() => {
    if (livePos) setDriverPos({ lat: livePos.lat, lng: livePos.lng });
  }, [livePos]);

  // Driver animation (FALLBACK saat tidak ada driver live): move from random nearby spot toward pickup
  useEffect(() => {
    if (stage !== "matched" || !pickup || isLive) return;
    const start = { lat: pickup.lat + 0.012, lng: pickup.lng + 0.008 };
    setDriverPos(start);
    let t = 0;
    const interval = setInterval(() => {
      t += 0.04;
      if (t >= 1) {
        clearInterval(interval);
        setDriverPos({ ...pickup });
        setTimeout(() => setStage("trip"), 800);
        return;
      }
      setDriverPos({
        lat: start.lat + (pickup.lat - start.lat) * t,
        lng: start.lng + (pickup.lng - start.lng) * t,
      });
    }, 200);
    return () => clearInterval(interval);
  }, [stage, pickup]);

  // Trip animation (FALLBACK saat tidak ada driver live): move from pickup to dest
  useEffect(() => {
    if (stage !== "trip" || !pickup || !dest || isLive) return;
    setDriverPos({ ...pickup });
    let t = 0;
    const interval = setInterval(() => {
      t += 0.025;
      if (t >= 1) {
        clearInterval(interval);
        setDriverPos({ ...dest });
        setStage("done");
        return;
      }
      setDriverPos({
        lat: pickup.lat + (dest.lat - pickup.lat) * t,
        lng: pickup.lng + (dest.lng - pickup.lng) * t,
      });
    }, 250);
    return () => clearInterval(interval);
  }, [stage, pickup, dest]);

  // Auto-trigger driver search
  useEffect(() => {
    if (stage === "finding") {
      const t = setTimeout(() => setStage("matched"), 2200);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const center: [number, number] = pickup
    ? [pickup.lat, pickup.lng]
    : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];

  const points: [number, number][] = [];
  if (pickup) points.push([pickup.lat, pickup.lng]);
  if (dest) points.push([dest.lat, dest.lng]);

  const reset = () => {
    setStage("search");
    setPickup(null);
    setDest(null);
    setSelectedRide(null);
    setDriverPos(null);
  };

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
          {dest && <Marker position={[dest.lat, dest.lng]} icon={destIcon} />}
          {driverPos && <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon} />}
          {pickup && dest && (
            <Polyline
              positions={[[pickup.lat, pickup.lng], [dest.lat, dest.lng]]}
              pathOptions={{ color: "hsl(202 99% 48%)", weight: 4, opacity: 0.7, dashArray: "8 8" }}
            />
          )}
        </MapContainer>
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 p-3 bg-card/95 backdrop-blur shadow-card">
        <Button size="icon" variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Pesan Ride</h1>
      </div>

      {/* POI selection sheet */}
      <Sheet open={activeField !== null} onOpenChange={(o) => !o && setActiveField(null)}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>{activeField === "pickup" ? "Pilih titik jemput" : "Pilih tujuan"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1 overflow-y-auto h-[calc(70vh-100px)]">
            {POIS.map((poi) => (
              <button
                key={poi.name}
                onClick={() => {
                  if (activeField === "pickup") setPickup(poi);
                  else setDest(poi);
                  setActiveField(null);
                }}
                className="w-full flex items-start gap-3 p-3 hover:bg-muted rounded-lg text-left"
              >
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{poi.name}</p>
                  <p className="text-xs text-muted-foreground">{poi.area}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom panel */}
      <div className="relative z-10 mt-auto">
        {/* SEARCH STAGE */}
        {stage === "search" && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-4 space-y-3">
            <button onClick={() => setActiveField("pickup")} className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted text-left">
              <div className="h-3 w-3 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Jemput di</p>
                <p className="text-sm font-medium truncate">{pickup?.name || "Pilih titik jemput"}</p>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => setActiveField("dest")} className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted text-left">
              <div className="h-3 w-3 rounded-sm bg-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Tujuan</p>
                <p className="text-sm font-medium truncate">{dest?.name || "Mau ke mana?"}</p>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
            <Button
              disabled={!pickup || !dest}
              onClick={() => setStage("select")}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              Lanjutkan
            </Button>
          </Card>
        )}

        {/* SELECT VEHICLE */}
        {stage === "select" && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">{pickup?.name} → {dest?.name}</p>
                <p className="text-sm font-medium">{distance.toFixed(1)} km</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setStage("search")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {RIDE_OPTIONS.map((opt) => {
                const Icon = iconMap[opt.icon];
                const price = Math.round(opt.basePrice + opt.pricePerKm * distance);
                const active = selectedRide?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedRide(opt)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                      active ? "border-primary bg-primary-soft" : "border-border bg-card"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-lg bg-ride-soft text-ride flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{opt.name}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                      <p className="text-xs text-muted-foreground">{opt.etaMin} menit</p>
                    </div>
                    <p className="font-bold text-accent">Rp{price.toLocaleString("id-ID")}</p>
                  </button>
                );
              })}
            </div>
            <Button
              disabled={!selectedRide}
              onClick={() => setStage("finding")}
              className="w-full mt-3 h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              Pesan {selectedRide?.name || "Sekarang"}
            </Button>
          </Card>
        )}

        {/* FINDING DRIVER */}
        {stage === "finding" && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="h-16 w-16 rounded-full bg-primary-soft flex items-center justify-center animate-pulse-soft">
                <Search className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="font-semibold text-lg">Mencari driver terdekat...</p>
            <p className="text-sm text-muted-foreground mt-1">Mohon tunggu sebentar</p>
            <Button variant="outline" onClick={reset} className="mt-4">Batalkan</Button>
          </Card>
        )}

        {/* MATCHED / TRIP */}
        {(stage === "matched" || stage === "trip") && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-primary">
                {stage === "matched" ? "🚗 Driver dalam perjalanan menjemput" : "🛣️ Dalam perjalanan ke tujuan"}
              </p>
              {isLive && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-[10px]">
                  <Radio className="h-3 w-3 animate-pulse" /> LIVE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <img src={driver.photo} alt={driver.name} className="h-14 w-14 rounded-full object-cover" />
              <div className="flex-1">
                <p className="font-semibold">{driver.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {driver.rating} · {driver.trips} trip
                </div>
                <p className="text-xs font-mono font-bold mt-0.5">{driver.plate}</p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="rounded-full"><Phone className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" className="rounded-full"><MessageCircle className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selectedRide?.name}</span>
              <span className="font-bold text-accent">
                Rp{Math.round((selectedRide?.basePrice ?? 0) + (selectedRide?.pricePerKm ?? 0) * distance).toLocaleString("id-ID")}
              </span>
            </div>
          </Card>
        )}

        {/* DONE */}
        {stage === "done" && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-3" />
            <h2 className="text-xl font-bold">Perjalanan Selesai!</h2>
            <p className="text-sm text-muted-foreground mt-1">Terima kasih sudah memesan dengan Traverla</p>
            <div className="flex justify-between text-sm mt-4 p-3 bg-muted/50 rounded-lg">
              <span>Total Pembayaran</span>
              <span className="font-bold text-accent">
                Rp{Math.round((selectedRide?.basePrice ?? 0) + (selectedRide?.pricePerKm ?? 0) * distance).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" onClick={() => navigate("/")}>Beranda</Button>
              <Button onClick={reset} className="bg-accent hover:bg-accent/90 text-accent-foreground">Pesan Lagi</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RideHome;
