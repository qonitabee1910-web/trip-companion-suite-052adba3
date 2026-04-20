import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { SeatMap } from "../components/SeatMap";
import { FareBreakdownCard } from "../components/FareBreakdownCard";
import { useCloudSnapshot } from "../hooks/useCloudSnapshot";
import { getService, getVehicleType, calcFareBreakdown, getVehicleSeatCount, SERVICES, VEHICLE_TYPES } from "../data/services";
import { getRayon, getDestination } from "../data/rayons";
import { addBooking } from "../data/repository";
import { getOccupiedSeats } from "../data/inventory";
import { StepperHeader } from "@/shared/components/StepperHeader";

const ShuttleBooking = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const rayon = getRayon(params.get("rayon") || "A");
  const DESTINATION = getDestination();
  const service = getService(params.get("service") || "reguler") || SERVICES[0];
  const vehicle = getVehicleType(params.get("vehicle") || "hiace") || VEHICLE_TYPES[0];
  const pickupCode = params.get("pickup") || rayon?.pickupPoints?.find((p) => p.code !== "DEST")?.code || "";
  const pickupPoint = rayon?.pickupPoints?.find((p) => p.code === pickupCode);
  const pickupName = pickupPoint?.name || pickupCode;
  const time = params.get("time") || "06:00";
  const pax = Number(params.get("pax") || 1);
  const dateStr = params.get("date") || "";
  const parsedDate = dateStr ? parseISO(dateStr) : null;
  const dateLabel =
    parsedDate && isValid(parsedDate)
      ? format(parsedDate, "EEE, d MMM yyyy", { locale: localeId })
      : "-";

  const totalSeats = getVehicleSeatCount(vehicle.id, service.tier);
  const occupiedSeats = new Set(
    getOccupiedSeats({
      date: dateStr,
      time,
      rayonId: rayon?.id || "A",
      vehicleId: vehicle.id,
      tier: service.tier,
    }),
  );

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [step, setStep] = useState<"seat" | "form" | "success">("seat");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [bookingId, setBookingId] = useState<string>("");

  const breakdown = calcFareBreakdown(vehicle, service, rayon, pickupCode);
  const unitPrice = breakdown.total;
  const total = unitPrice * pax;

  const handlePay = () => {
    if (!form.name || !form.phone) return;
    const created = addBooking({
      rayonId: rayon?.id || "A",
      rayonName: `${rayon?.name ?? ""} (${rayon?.area ?? ""})`,
      pickup: pickupName,
      date: dateStr,
      time,
      vehicleId: vehicle.id,
      vehicleLabel: `${vehicle.label} • ${vehicle.vehicleName}`,
      serviceTier: service.tier,
      serviceLabel: service.label,
      seats: selectedSeats,
      pax,
      unitPrice,
      totalPrice: total,
      customerName: form.name,
      customerPhone: form.phone,
    });
    setBookingId(created.id);
    setStep("success");
  };

  const toggleSeat = (n: number) => {
    if (occupiedSeats.has(n)) return;
    setSelectedSeats((prev) =>
      prev.includes(n) ? prev.filter((s) => s !== n) : prev.length < pax ? [...prev, n] : prev,
    );
  };

  if (step === "success") {
    return (
      <ResponsiveLayout mobileTitle="E-Ticket" mobileBack="/" hideBottomNav mobileHeaderVariant="plain">
        <div className="container max-w-lg py-10 px-4">
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Tiket Dikonfirmasi!</h1>
            <p className="text-muted-foreground mb-6 font-mono font-bold">
              {bookingId || `TRV-S${Date.now().toString().slice(-7)}`}
            </p>
            <div className="text-left bg-muted/50 rounded-lg p-4 space-y-2 mb-6 text-sm">
              <div className="flex justify-between"><span>Rayon</span><span className="font-medium">{rayon?.name} ({rayon?.area})</span></div>
              <div className="flex justify-between"><span>Tujuan</span><span className="font-medium">{DESTINATION.short}</span></div>
              <div className="flex justify-between"><span>Service</span><span className="font-medium">{service.label}</span></div>
              <div className="flex justify-between"><span>Kendaraan</span><span className="font-medium">{vehicle.label} • {vehicle.vehicleName}</span></div>
              <div className="flex justify-between"><span>Tanggal</span><span className="font-medium">{dateLabel}</span></div>
              <div className="flex justify-between"><span>Berangkat</span><span className="font-medium">{time}</span></div>
              <div className="flex justify-between"><span>Jemput</span><span className="font-medium">{pickupName}</span></div>
              <div className="flex justify-between"><span>Kursi</span><span className="font-medium">{selectedSeats.join(", ")}</span></div>
              <div className="flex justify-between pt-2 border-t font-bold"><span>Total</span><span className="text-accent">Rp{total.toLocaleString("id-ID")}</span></div>
            </div>
            <Button onClick={() => navigate("/")} className="w-full">Kembali ke Beranda</Button>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  if (step === "form") {
    return (
      <ResponsiveLayout mobileTitle="Data Penumpang" mobileBack="#" hideBottomNav mobileHeaderVariant="plain">
        <div className="container max-w-2xl py-4 md:py-8 px-3 md:px-6">
          <Card className="p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-lg">Data Penumpang Utama</h2>
            <div>
              <Label>Nama Lengkap</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>No. Telepon</Label>
              <Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <Button
              onClick={handlePay}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-semibold"
            >
              Bayar Rp{total.toLocaleString("id-ID")}
            </Button>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout
      mobileTitle="Pilih Kursi"
      mobileBack={`/shuttle/vehicle?${params.toString()}`}
      hideBottomNav
      mobileHeaderVariant="plain"
    >
      <div className="container max-w-3xl py-4 md:py-8 px-3 md:px-6 space-y-4">
        <StepperHeader current="seat" />
        <div className="grid md:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-1">Pilih Kursi ({selectedSeats.length}/{pax})</h2>
            <p className="text-xs text-muted-foreground text-center mb-3">
              {vehicle.label} • {vehicle.vehicleName} • {service.label}
            </p>
            <SeatMap
              vehicle={vehicle.id}
              totalSeats={totalSeats}
              occupied={occupiedSeats}
              selected={selectedSeats}
              maxSelect={pax}
              onToggle={toggleSeat}
              tier={service.tier as "reguler" | "semi-executive" | "executive"}
            />
          </Card>
        </div>

        <Card className="p-4 h-fit md:sticky md:top-4">
          <h3 className="font-semibold mb-3">Ringkasan</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Rayon</span><span className="font-medium">{rayon?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Jemput</span><span className="font-medium truncate ml-2">{pickupName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tujuan</span><span className="font-medium">{DESTINATION.short}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{service.label}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kendaraan</span><span className="font-medium">{vehicle.label}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal</span><span className="font-medium">{dateLabel}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Berangkat</span><span className="font-medium">{time}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Penumpang</span><span className="font-medium">{pax}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kursi</span><span className="font-medium">{selectedSeats.join(", ") || "-"}</span></div>
          </div>

          {/* Fare breakdown */}
          <div className="mt-3 pt-3 border-t space-y-1 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Route className="h-3 w-3" />
              <span>Rincian tarif</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Jarak {breakdown.distanceKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km × Rp{breakdown.farePerKm.toLocaleString("id-ID")}
              </span>
              <span>Rp{Math.round(breakdown.distanceFare).toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Multiplier {service.label} ×{breakdown.multiplier}</span>
              <span>Rp{Math.round(breakdown.serviceFare).toLocaleString("id-ID")}</span>
            </div>
            {breakdown.surcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surcharge</span>
                <span>+Rp{breakdown.surcharge.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Per kursi</span>
              <span className="font-medium">Rp{unitPrice.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">× {pax} pax</span>
              <span className="font-bold text-accent">Rp{total.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <Button
            disabled={selectedSeats.length !== pax}
            onClick={() => setStep("form")}
            className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-semibold"
          >
            Lanjut
          </Button>
        </Card>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default ShuttleBooking;
