import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Star, DollarSign, Clock, Loader2 } from "lucide-react";
import { useState } from "react";

interface TripCompletedScreenProps {
  open: boolean;
  onClose: () => void;
  driverName?: string;
  driverPhoto?: string;
  plate?: string;
  totalFare?: number;
  duration?: number;
  distance?: number;
  pickupName?: string;
  dropoffName?: string;
  onRateDriver?: (rating: number, comment: string) => void;
  isSubmitting?: boolean;
}

export const TripCompletedScreen = React.forwardRef<
  HTMLDivElement,
  TripCompletedScreenProps
>(
  (
    {
      open,
      onClose,
      driverName = "Driver",
      driverPhoto = "",
      plate = "B 1234 ABC",
      totalFare = 50000,
      duration = 15,
      distance = 8.5,
      pickupName = "Pickup",
      dropoffName = "Dropoff",
      onRateDriver,
      isSubmitting = false,
    },
    ref
  ) => {
    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState("");
    const [showRating, setShowRating] = useState(true);

    const handleSubmitRating = () => {
      if (onRateDriver) {
        onRateDriver(rating, comment);
      }
      setShowRating(false);
    };

    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent ref={ref} side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Perjalanan Selesai</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Success Icon */}
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Trip Summary */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Dari</p>
                  <p className="font-semibold text-sm">{pickupName}</p>
                </div>
              </div>

              <div className="h-8 ml-4 border-l-2 border-dashed border-primary opacity-50" />

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Ke</p>
                  <p className="font-semibold text-sm">{dropoffName}</p>
                </div>
              </div>
            </Card>

            {/* Trip Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold text-sm">{duration} menit</p>
                <p className="text-xs text-muted-foreground">Durasi</p>
              </Card>
              <Card className="p-3 text-center">
                <MapPin className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold text-sm">{distance.toFixed(1)} km</p>
                <p className="text-xs text-muted-foreground">Jarak</p>
              </Card>
              <Card className="p-3 text-center">
                <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold text-sm">Rp{totalFare.toLocaleString("id-ID")}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </Card>
            </div>

            {/* Driver Info */}
            {showRating && (
              <Card className="p-4 space-y-4">
                <p className="font-semibold text-sm">Nilai Driver Anda</p>

                {/* Driver Card */}
                <div className="flex items-start gap-3 pb-4 border-b">
                  {driverPhoto && (
                    <img
                      src={driverPhoto}
                      alt={driverName}
                      className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{driverName}</p>
                    <p className="text-xs text-muted-foreground">{plate}</p>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">Bagaimana pengalaman Anda?</p>
                  <div className="flex justify-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-3xl transition-transform hover:scale-110"
                      >
                        {star <= rating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-accent">{rating} dari 5 bintang</p>
                </div>

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tambahkan komentar (opsional)..."
                  className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />

                {/* Submit Rating */}
                <Button
                  onClick={handleSubmitRating}
                  disabled={isSubmitting}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sedang Mengirim...
                    </>
                  ) : (
                    "Kirim Penilaian"
                  )}
                </Button>
              </Card>
            )}

            {/* Payment Method Info */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Metode Pembayaran</p>
              <p className="font-semibold text-sm">Tunai kepada Driver</p>
              <p className="text-xs text-muted-foreground mt-1">
                Silakan bayarkan ke driver: Rp{totalFare.toLocaleString("id-ID")}
              </p>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2 pb-4">
              <Button
                onClick={onClose}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Selesai
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

TripCompletedScreen.displayName = "TripCompletedScreen";
