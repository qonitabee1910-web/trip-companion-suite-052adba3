import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Search, Bike, Car, Users, Star, Phone, MessageCircle, X, CheckCircle2, Radio, AlertCircle } from "lucide-react";
import { POIS, RIDE_OPTIONS, DRIVERS, DEFAULT_LOCATION, distanceKm } from "../data/ride";
import type { POI, RideOption } from "../data/ride";
import { ServiceTypeSelector, ServiceTypeInfo } from "../components/ServiceTypeSelector";
import { calculateServiceTypeFare, type ServiceTypeId } from "../types/serviceType";
import { useLiveDriverPosition } from "../hooks/useLiveDriverPosition";
import { useRideRequest } from "../hooks/useRideRequest";
import { LocationSearchAdvanced } from "../components/LocationSearchAdvanced";
import { RideConfirmationSheet } from "../components/RideConfirmationSheet";
import { DriverSearchingScreen } from "../components/DriverSearchingScreen";
import { TripOngoingScreen } from "../components/TripOngoingScreen";
import { TripCompletedScreen } from "../components/TripCompletedScreen";
import { useAuth } from "@/shared/auth/useAuth";

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

type Stage = "service" | "search" | "confirm" | "finding" | "ongoing" | "completed";

const RideHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rideState = useRideRequest();

  // Local UI state
  const [stage, setStage] = useState<Stage>("service");
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceTypeId>("standard");
  const [pickup, setPickup] = useState<POI | null>(null);
  const [dest, setDest] = useState<POI | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
  const [locationPickerType, setLocationPickerType] = useState<"pickup" | "dest" | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [demoDriver] = useState(() => DRIVERS[Math.floor(Math.random() * DRIVERS.length)]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const distance = pickup && dest ? distanceKm(pickup, dest) : 0;

  // Calculate fare with service type multiplier
  const fareInfo = selectedRide
    ? calculateServiceTypeFare(
      selectedRide.basePrice,
      selectedRide.pricePerKm,
      distance,
      selectedServiceType
    )
    : null;

  const fare = fareInfo?.totalFare ?? 0;

  // Get user's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGeoError(null);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setGeoError("Tidak dapat mengakses lokasi Anda");
        }
      );
    }
  }, []);

  // Monitor ride status from Supabase
  useEffect(() => {
    if (!rideState.rideId) return;

    if (rideState.status === "pending") {
      setStage("finding");
      // Simulate driver search
      setTimeout(() => {
        setStage("ongoing");
      }, 3000);
    } else if (rideState.status === "accepted" || rideState.status === "arriving") {
      setStage("ongoing");
    } else if (rideState.status === "in_progress") {
      setStage("ongoing");
    } else if (rideState.status === "completed") {
      setStage("completed");
    }
  }, [rideState.status]);

  // Animate driver position from pickup to dest
  useEffect(() => {
    if (stage !== "ongoing" || !pickup || !dest) return;

    setDriverPos({ ...pickup });
    let t = 0;
    const interval = setInterval(() => {
      t += 0.015;
      if (t >= 1) {
        clearInterval(interval);
        setDriverPos({ ...dest });
        return;
      }
      setDriverPos({
        lat: pickup.lat + (dest.lat - pickup.lat) * t,
        lng: pickup.lng + (dest.lng - pickup.lng) * t,
      });
    }, 300);
    return () => clearInterval(interval);
  }, [stage, pickup, dest]);

  const handleRequestRide = async () => {
    if (!user || !pickup || !dest || !selectedRide) {
      alert("Informasi tidak lengkap");
      return;
    }

    setShowConfirmation(false);

    const ride = await rideState.requestRide(
      pickup.lat,
      pickup.lng,
      pickup.name,
      dest.lat,
      dest.lng,
      dest.name,
      selectedRide.id,
      fare,
      distance,
      selectedServiceType
    );

    if (ride) {
      setStage("finding");
    }
  };

  const center: [number, number] = pickup
    ? [pickup.lat, pickup.lng]
    : userLocation
      ? [userLocation.lat, userLocation.lng]
      : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];

  const points: [number, number][] = [];
  if (pickup) points.push([pickup.lat, pickup.lng]);
  if (dest) points.push([dest.lat, dest.lng]);

  const handleServiceTypeSelect = (serviceType: ServiceTypeId) => {
    setSelectedServiceType(serviceType);
    setStage("search");
  };

  const reset = () => {
    setStage("service");
    setSelectedServiceType("standard");
    setPickup(null);
    setDest(null);
    setSelectedRide(null);
    setDriverPos(null);
    rideState.reset();
  };

  if (!user) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-card gap-4 p-4">
        <AlertCircle className="h-16 w-16 text-yellow-600" />
        <h1 className="font-semibold text-lg">Login Diperlukan</h1>
        <p className="text-sm text-muted-foreground text-center">Silakan login untuk memesan ride</p>
        <Button onClick={() => navigate("/auth")} className="w-full">
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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

      {/* Location Search Modal */}
      <LocationSearchAdvanced
        open={locationPickerType !== null}
        onClose={() => setLocationPickerType(null)}
        onSelect={(location) => {
          if (locationPickerType === "pickup") {
            setPickup(location);
          } else if (locationPickerType === "dest") {
            setDest(location);
          }
        }}
        title={locationPickerType === "pickup" ? "Pilih titik jemput" : "Pilih tujuan"}
        showCurrentLocation={locationPickerType === "pickup" && !!userLocation}
        onCurrentLocation={() => {
          if (userLocation) {
            // Find nearest POI to user location
            setPickup(POIS[0]); // Fallback to first POI
          }
        }}
        userLat={userLocation?.lat}
        userLng={userLocation?.lng}
        placeholder={locationPickerType === "pickup" ? "Cari titik jemput..." : "Cari tujuan..."}
      />

      {/* Ride Confirmation Sheet */}
      <RideConfirmationSheet
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleRequestRide}
        pickup={pickup}
        dropoff={dest}
        selectedRide={selectedRide}
        fare={fare}
        distance={distance}
        eta={selectedRide?.etaMin}
        loading={rideState.loading}
        serviceType={selectedServiceType}
        fareInfo={fareInfo || undefined}
      />

      {/* Driver Searching Screen */}
      <DriverSearchingScreen
        open={stage === "finding"}
        onClose={() => rideState.cancel()}
        driver={stage === "finding" ? null : demoDriver}
        searching={stage === "finding"}
        eta={5}
      />

      {/* Trip Ongoing Screen */}
      <TripOngoingScreen
        open={stage === "ongoing"}
        driverName={demoDriver.name}
        driverPhoto={demoDriver.photo}
        plate={demoDriver.plate}
        eta={5}
        pickupName={pickup?.name}
        dropoffName={dest?.name}
        totalFare={fare}
      />

      {/* Trip Completed Screen */}
      <TripCompletedScreen
        open={stage === "completed"}
        onClose={reset}
        driverName={demoDriver.name}
        driverPhoto={demoDriver.photo}
        plate={demoDriver.plate}
        totalFare={fare}
        duration={15}
        distance={distance}
        pickupName={pickup?.name}
        dropoffName={dest?.name}
      />

      {/* Bottom panel - Main UI */}
      <div className="relative z-10 mt-auto">
        {stage === "service" && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-4 space-y-4">
            <div>
              <h2 className="font-semibold text-lg mb-1">Pilih Layanan</h2>
              <p className="text-xs text-muted-foreground">Pilih jenis layanan yang sesuai dengan kebutuhan Anda</p>
            </div>

            <ServiceTypeSelector
              selectedServiceType={selectedServiceType}
              onSelect={handleServiceTypeSelect}
              userGender={user?.user_metadata?.gender as "male" | "female" | "other"}
            />

            <ServiceTypeInfo serviceTypeId={selectedServiceType} />
          </Card>
        )}

        {stage === "search" && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-4 space-y-3">
            {/* Service Type Badge */}
            <button
              onClick={() => setStage("service")}
              className="flex items-center justify-between p-2 rounded-lg border bg-muted/50 hover:bg-muted text-left group"
            >
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Layanan</p>
                <p className="text-sm font-medium">{selectedServiceType === "standard" ? "Ride Standard" : selectedServiceType === "women" ? "Ride Women" : "Ride Car Premium"}</p>
              </div>
              <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Ubah
              </Badge>
            </button>

            {geoError && (
              <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                {geoError}
              </div>
            )}

            <button
              onClick={() => setLocationPickerType("pickup")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted text-left"
            >
              <div className="h-3 w-3 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Jemput di</p>
                <p className="text-sm font-medium truncate">{pickup?.name || "Pilih titik jemput"}</p>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setLocationPickerType("dest")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted text-left"
            >
              <div className="h-3 w-3 rounded-sm bg-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Tujuan</p>
                <p className="text-sm font-medium truncate">{dest?.name || "Mau ke mana?"}</p>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>

            <Button
              disabled={!pickup || !dest}
              onClick={() => setStage("confirm")}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              Lanjutkan
            </Button>
          </Card>
        )}

        {stage === "confirm" && (
          <Card className="rounded-t-2xl rounded-b-none border-b-0 shadow-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {pickup?.name} → {dest?.name}
                </p>
                <p className="text-sm font-medium">{distance.toFixed(1)} km</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setStage("search")} title="Kembali">
                  <X className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setStage("service")} title="Ubah layanan">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Service type display */}
            <div className="mb-3 p-2 rounded-lg bg-muted/50 text-xs">
              <span className="font-medium">
                Layanan: {selectedServiceType === "standard" ? "Ride Standard" : selectedServiceType === "women" ? "Ride Women" : "Ride Car Premium"}
              </span>
              {fareInfo?.multiplier && fareInfo.multiplier > 1.0 && (
                <span className="ml-2 text-accent font-semibold">
                  +{Math.round((fareInfo.multiplier - 1) * 100)}%
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[35vh] overflow-y-auto">
              {RIDE_OPTIONS.map((opt) => {
                const Icon = iconMap[opt.icon];
                const optionFare = calculateServiceTypeFare(
                  opt.basePrice,
                  opt.pricePerKm,
                  distance,
                  selectedServiceType
                );
                const active = selectedRide?.id === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedRide(opt)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${active ? "border-primary bg-primary-soft" : "border-border bg-card"
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
                    <div className="text-right">
                      <p className="font-bold text-accent">Rp{optionFare.totalFare.toLocaleString("id-ID")}</p>
                      {optionFare.multiplier > 1.0 && (
                        <p className="text-xs text-muted-foreground">+{Math.round((optionFare.multiplier - 1) * 100)}%</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              disabled={!selectedRide}
              onClick={() => setShowConfirmation(true)}
              className="w-full mt-3 h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              Lanjutkan ke Konfirmasi
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RideHome;
