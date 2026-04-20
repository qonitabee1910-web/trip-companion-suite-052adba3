import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Clock, Users, AlertCircle } from "lucide-react";
import { RIDE_OPTIONS } from "../data/ride";
import type { RideOption } from "../data/ride";

interface RideConfirmationSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pickup?: { name: string; distance?: string };
  dropoff?: { name: string };
  selectedRide?: RideOption;
  fare?: number;
  distance?: number;
  eta?: number;
  loading?: boolean;
}

export const RideConfirmationSheet = React.forwardRef<
  HTMLDivElement,
  RideConfirmationSheetProps
>(
  (
    {
      open,
      onClose,
      onConfirm,
      pickup,
      dropoff,
      selectedRide,
      fare = 0,
      distance = 0,
      eta = 0,
      loading = false,
    },
    ref
  ) => {
    if (!selectedRide) return null;

    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent ref={ref} side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Konfirmasi Pesanan</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Route Summary */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Jemput di</p>
                  <p className="font-semibold text-sm">{pickup?.name}</p>
                </div>
              </div>

              <div className="h-8 ml-4 border-l-2 border-dashed border-primary opacity-50" />

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tujuan</p>
                  <p className="font-semibold text-sm">{dropoff?.name}</p>
                </div>
              </div>
            </Card>

            {/* Vehicle Details */}
            <Card className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-lg bg-ride-soft flex items-center justify-center flex-shrink-0">
                  {selectedRide.icon === "bike" && <span className="text-2xl">🏍️</span>}
                  {selectedRide.icon === "car" && <span className="text-2xl">🚗</span>}
                  {selectedRide.icon === "carxl" && <span className="text-2xl">🚙</span>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{selectedRide.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedRide.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Hingga {selectedRide.capacity} orang</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Trip Details */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Jarak</p>
                <p className="font-semibold text-sm">{distance.toFixed(1)} km</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Estimasi</p>
                <p className="font-semibold text-sm">{eta} menit</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Harga</p>
                <p className="font-semibold text-sm text-accent">Rp{fare.toLocaleString("id-ID")}</p>
              </Card>
            </div>

            {/* Price Breakdown */}
            <Card className="p-4 space-y-2 border-yellow-200 bg-yellow-50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-900">
                  <p className="font-semibold mb-1">Perhatian</p>
                  <p>Harga dapat berubah berdasarkan kondisi lalu lintas dan permintaan real-time.</p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pb-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? "Sedang Memproses..." : "Pesan Sekarang"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

RideConfirmationSheet.displayName = "RideConfirmationSheet";
