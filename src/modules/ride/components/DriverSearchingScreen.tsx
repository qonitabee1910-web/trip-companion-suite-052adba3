import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, MapPin, Phone, MessageCircle } from "lucide-react";

interface Driver {
  name: string;
  plate: string;
  rating: number;
  photo: string;
  trips: number;
}

interface DriverSearchingScreenProps {
  open: boolean;
  onClose: () => void;
  driver?: Driver | null;
  searching?: boolean;
  eta?: number;
}

export const DriverSearchingScreen = React.forwardRef<
  HTMLDivElement,
  DriverSearchingScreenProps
>(({ open, onClose, driver, searching = true, eta = 2 }, ref) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent ref={ref} side="bottom" className="h-auto">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <SheetTitle>{searching ? "Mencari Driver..." : "Driver Terdekat"}</SheetTitle>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="space-y-4">
          {searching ? (
            /* Searching State */
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary-soft flex items-center justify-center animate-pulse-soft">
                  <div className="h-8 w-8 bg-primary rounded-full animate-pulse" />
                </div>
              </div>
              <p className="font-semibold text-lg mb-2">Sedang Mencari Driver...</p>
              <p className="text-sm text-muted-foreground mb-4">Silakan tunggu sebentar</p>
              <div className="flex justify-center gap-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          ) : driver ? (
            /* Driver Found */
            <>
              <Card className="p-4">
                <div className="flex items-start gap-4">
                  {/* Driver Photo */}
                  <img
                    src={driver.photo}
                    alt={driver.name}
                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                  />

                  {/* Driver Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{driver.name}</p>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-900 hover:bg-yellow-100">
                        ⭐ {driver.rating}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Pelat Nomor: {driver.plate}</p>
                    <p className="text-xs text-muted-foreground">{driver.trips} perjalanan</p>
                  </div>
                </div>
              </Card>

              {/* ETA */}
              <Card className="p-4 text-center bg-blue-50 border-blue-200">
                <p className="text-xs text-muted-foreground mb-1">Driver akan tiba dalam</p>
                <p className="text-2xl font-bold text-blue-600">{eta} menit</p>
              </Card>

              {/* Driver Contact Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    // Open phone dialer
                    window.location.href = "tel:+62812345678";
                  }}
                >
                  <Phone className="h-4 w-4" />
                  Hubungi
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    // Open messaging
                    alert("Chat feature akan segera hadir");
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Button>
              </div>

              {/* Trip Info */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lokasi Driver</p>
                    <p className="text-sm font-medium">Sedang menuju Anda</p>
                  </div>
                </div>
              </Card>

              {/* Cancel Button */}
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full text-destructive hover:bg-destructive/10"
              >
                Batal Pesanan
              </Button>
            </>
          ) : (
            /* No Driver Available */
            <div className="text-center py-8">
              <p className="font-semibold text-lg mb-2">Tidak Ada Driver Tersedia</p>
              <p className="text-sm text-muted-foreground mb-4">
                Coba lagi nanti atau ubah lokasi Anda
              </p>
              <Button onClick={onClose} className="w-full">
                Coba Lagi
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});

DriverSearchingScreen.displayName = "DriverSearchingScreen";
