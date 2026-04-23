import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, parseISO, isValid, parse, addMinutes } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Download, FileImage, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SeatMap } from "../components/SeatMap";
import { FareBreakdownCard } from "../components/FareBreakdownCard";
import { PickupPointFareSummary } from "../components/PickupPointFareSummary";
import { PaymentMethodPicker } from "../components/PaymentMethodPicker";
import { TicketCard } from "../components/TicketCard";
import { useCloudSnapshot } from "../hooks/useCloudSnapshot";
import { getService, getVehicleType, calcFareBreakdown, getVehicleSeatCount, SERVICES, VEHICLE_TYPES } from "../data/services";
import { calcFareBreakdownCompat } from "../lib/migrationHelper";
import { getRayon, getDestination } from "../data/rayons";
import { addBooking, isVehicleAllowed, logVehicleAccessAttempt } from "../data/repository";
import { getOccupiedSeats } from "../data/inventory";
import { StepperHeader } from "@/shared/components/StepperHeader";
import {
  createPayment,
  getActivePaymentMethods,
  type PaymentMethodId,
} from "../data/payment";
import { downloadTicketPDF, downloadTicketPNG } from "../lib/exportTicket";
import type { ShuttleBooking } from "../types/booking";

type Step = "seat" | "form" | "payment" | "success";

const ShuttleBooking = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useCloudSnapshot();

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
  const [step, setStep] = useState<Step>("seat");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ShuttleBooking | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);

  // NEW: Async fare calculation state
  const [breakdown, setBreakdown] = useState<any>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);

  // Validate vehicle-tier access on mount
  useEffect(() => {
    const allowed = isVehicleAllowed(vehicle.id, service.tier);
    if (!allowed) {
      // Log bypass attempt
      logVehicleAccessAttempt(
        vehicle.id,
        service.tier,
        "bypass_attempt",
        "blocked",
        "vehicle_tier_not_allowed",
      );

      toast.error(
        `${vehicle.label} tidak tersedia untuk tier ${service.label}. Silakan pilih kendaraan lain.`,
      );

      // Redirect back to vehicle selection
      navigate(`/shuttle/vehicle?${params.toString()}`, { replace: true });
    }
  }, [vehicle.id, service.tier, navigate, params]);

  // Load breakdown asynchronously (with OSRM support via feature flag)
  useEffect(() => {
    setBreakdownLoading(true);
    calcFareBreakdownCompat(vehicle, service, rayon, pickupCode)
      .then((bd) => {
        setBreakdown(bd);

        // Calculate estimated arrival time if duration available
        if (bd.estimatedDurationMin && time) {
          try {
            const departure = parse(time, "HH:mm", new Date());
            const arrival = addMinutes(departure, bd.estimatedDurationMin);
            setEstimatedArrival(format(arrival, "HH:mm"));
          } catch (e) {
            console.warn("Could not calculate arrival time:", e);
          }
        }
      })
      .catch((err) => {
        console.error("Fare calculation error:", err);
        // Fallback to legacy calculation
        try {
          const legacy = calcFareBreakdown(vehicle, service, rayon, pickupCode);
          setBreakdown(legacy);
        } catch (e) {
          console.error("Fallback also failed:", e);
        }
      })
      .finally(() => setBreakdownLoading(false));
  }, [vehicle, service, rayon, pickupCode, time]);

  // Calculate prices once breakdown is loaded
  const unitPrice = breakdown?.total || 0;
  const total = unitPrice * pax;

  const activeMethods = getActivePaymentMethods();
  const methodLabel = activeMethods.find((m) => m.id === paymentMethod)?.label;

  const handlePay = async () => {
    if (!paymentMethod) {
      toast.error("Pilih metode pembayaran dulu");
      return;
    }
    setPaying(true);
    const result = await createPayment({
      amount: total,
      method: paymentMethod,
      customerName: form.name,
      customerPhone: form.phone,
      description: `Shuttle ${rayon?.name} → ${DESTINATION.short}`,
    });
    if (!result.ok) {
      setPaying(false);
      toast.error(result.error || "Pembayaran gagal");
      return;
    }
    if (result.redirectUrl) {
      // Real gateway: open Snap/Invoice URL
      window.open(result.redirectUrl, "_blank", "noopener");
    }
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
      paymentMethod: methodLabel ?? paymentMethod,
      paymentStatus: result.status === "settled" ? "paid" : "pending",
      paymentRef: result.ref,
    });
    setConfirmedBooking(created);

    // Log successful booking
    logVehicleAccessAttempt(vehicle.id, service.tier, "book", "allowed", undefined);

    setPaying(false);
    setStep("success");
  };

  const toggleSeat = (n: number) => {
    if (occupiedSeats.has(n)) return;
    setSelectedSeats((prev) =>
      prev.includes(n) ? prev.filter((s) => s !== n) : prev.length < pax ? [...prev, n] : prev,
    );
  };

  const handleDownload = async (kind: "pdf" | "png") => {
    if (!confirmedBooking) return;
    setExporting(kind);
    try {
      if (kind === "pdf") await downloadTicketPDF("ticket-export", confirmedBooking.id);
      else await downloadTicketPNG("ticket-export", confirmedBooking.id);
      toast.success(`Tiket ${kind.toUpperCase()} ter-download`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal generate tiket");
    } finally {
      setExporting(null);
    }
  };

  // ============ SUCCESS ============
  if (step === "success" && confirmedBooking) {
    return (
      <ResponsiveLayout mobileTitle="E-Ticket" mobileBack="/" hideBottomNav mobileHeaderVariant="plain">
        <div className="container max-w-lg py-6 px-4 space-y-4">
          <div className="text-center">
            <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-2" />
            <h1 className="text-xl font-bold">Pembayaran Berhasil!</h1>
            <p className="text-sm text-muted-foreground">
              Simpan tiket Anda untuk ditunjukkan saat boarding.
            </p>
          </div>

          <TicketCard
            booking={confirmedBooking}
            destinationLabel={DESTINATION.short}
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleDownload("pdf")}
              disabled={!!exporting}
              variant="outline"
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              onClick={() => handleDownload("png")}
              disabled={!!exporting}
              variant="outline"
            >
              {exporting === "png" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileImage className="h-4 w-4" />
              )}
              PNG
            </Button>
          </div>

          <Button onClick={() => navigate("/")} className="w-full" size="lg">
            Kembali ke Beranda
          </Button>
        </div>
      </ResponsiveLayout>
    );
  }

  // ============ PAYMENT ============
  if (step === "payment") {
    return (
      <ResponsiveLayout
        mobileTitle="Metode Pembayaran"
        mobileBack="#"
        hideBottomNav
        mobileHeaderVariant="plain"
      >
        <div className="container max-w-2xl py-4 md:py-8 px-3 md:px-6 space-y-4">
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Pilih Metode Pembayaran</h2>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Ubah data
              </button>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rute</span>
                <span className="font-medium truncate ml-2">
                  {rayon?.name} → {DESTINATION.short}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span className="font-medium">{dateLabel} • {time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penumpang</span>
                <span className="font-medium">{pax} pax • Kursi {selectedSeats.join(", ")}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold text-base">
                <span>Total</span>
                <span className="text-accent">Rp{total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <PaymentMethodPicker
              methods={activeMethods}
              selected={paymentMethod}
              onSelect={setPaymentMethod}
            />

            <Button
              onClick={handlePay}
              disabled={!paymentMethod || paying}
              className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-semibold"
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                </>
              ) : (
                <>Bayar Rp{total.toLocaleString("id-ID")}</>
              )}
            </Button>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  // ============ FORM ============
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
              onClick={() => {
                if (!form.name || !form.phone) {
                  toast.error("Lengkapi nama dan telepon");
                  return;
                }
                setStep("payment");
              }}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-semibold"
            >
              Lanjut ke Pembayaran
            </Button>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  // ============ SEAT (default) ============
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
              {/* NEW: Show estimated arrival if available */}
              {estimatedArrival && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiba (Est.)</span>
                  <span className="font-medium">{estimatedArrival}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Penumpang</span><span className="font-medium">{pax}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Kursi</span><span className="font-medium">{selectedSeats.join(", ") || "-"}</span></div>
            </div>

            {/* Pickup point fare summary */}
            <div className="mt-3">
              <PickupPointFareSummary
                vehicle={vehicle}
                service={service}
                rayon={rayon}
                pickupCode={pickupCode}
                compact
              />
            </div>

            {/* Fare breakdown */}
            <div className="mt-3 pt-3 border-t">
              <FareBreakdownCard
                vehicle={vehicle}
                service={service}
                rayon={rayon}
                pickupCode={pickupCode}
                pax={pax}
              />
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
