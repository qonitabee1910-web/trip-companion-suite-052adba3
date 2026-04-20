import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MapPin, AlertCircle, Phone, MessageCircle, CheckCircle2 } from "lucide-react";

interface TripOngoingScreenProps {
  open: boolean;
  onClose?: () => void;
  driverName?: string;
  driverPhoto?: string;
  plate?: string;
  eta?: number;
  pickupName?: string;
  dropoffName?: string;
  totalFare?: number;
}

export const TripOngoingScreen = React.forwardRef<
  HTMLDivElement,
  TripOngoingScreenProps
>(
  (
    {
      open,
      onClose,
      driverName = "Driver",
      driverPhoto = "",
      plate = "B 1234 ABC",
      eta = 5,
      pickupName = "Pickup",
      dropoffName = "Dropoff",
      totalFare = 50000,
    },
    ref
  ) => {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent ref={ref} side="bottom" className="h-auto border-t-2 border-primary">
          {/* Driver Card */}
          <div className="space-y-4 mt-6">
            <Card className="p-4">
              <div className="flex items-start gap-4 mb-4">
                {driverPhoto && (
                  <img
                    src={driverPhoto}
                    alt={driverName}
                    className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{driverName}</p>
                  <p className="text-xs text-muted-foreground">Plat: {plate}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Dalam Perjalanan
                </Badge>
              </div>

              {/* ETA */}
              <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-200">
                <p className="text-xs text-muted-foreground mb-1">Estimasi Kedatangan</p>
                <p className="text-2xl font-bold text-blue-600">{eta} menit</p>
              </div>
            </Card>

            {/* Trip Details */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Jemput di</p>
                  <p className="font-semibold text-sm">{pickupName}</p>
                </div>
              </div>

              <div className="h-8 ml-4 border-l-2 border-dashed border-primary opacity-50" />

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tujuan</p>
                  <p className="font-semibold text-sm">{dropoffName}</p>
                </div>
              </div>
            </Card>

            {/* Emergency Alert */}
            <Card className="p-3 bg-red-50 border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-900 mb-1">Keselamatan Anda Prioritas Kami</p>
                <p className="text-xs text-red-800">Bagikan rincian perjalanan dengan kontak darurat Anda</p>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" size="sm">
                <Phone className="h-4 w-4" />
                Hubungi
              </Button>
              <Button variant="outline" className="gap-2" size="sm">
                <MessageCircle className="h-4 w-4" />
                Chat
              </Button>
            </div>

            {/* Fare Info */}
            <Card className="p-4 bg-accent-soft border-accent">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Estimasi Total</p>
                <p className="text-lg font-bold text-accent">Rp{totalFare.toLocaleString("id-ID")}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Harga final mungkin berbeda tergantung rute aktual
              </p>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

TripOngoingScreen.displayName = "TripOngoingScreen";
