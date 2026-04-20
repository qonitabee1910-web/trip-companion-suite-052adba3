import React, { useState, useEffect } from "react";
import { MapPin, Navigation2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { POIS } from "../data/ride";
import type { POI } from "../data/ride";

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: POI) => void;
  title: string;
  showCurrentLocation?: boolean;
  onCurrentLocation?: () => void;
}

export const LocationPicker = React.forwardRef<HTMLDivElement, LocationPickerProps>(
  ({ open, onClose, onSelect, title, showCurrentLocation = false, onCurrentLocation }, ref) => {
    const [search, setSearch] = useState("");
    const [recentLocations, setRecentLocations] = useState<POI[]>([]);

    useEffect(() => {
      // Load recent locations from localStorage
      const stored = localStorage.getItem("recentRideLocations");
      if (stored) {
        try {
          setRecentLocations(JSON.parse(stored));
        } catch (e) {
          console.error("Error loading recent locations:", e);
        }
      }
    }, []);

    const filtered = POIS.filter((poi) =>
      poi.name.toLowerCase().includes(search.toLowerCase()) ||
      poi.area.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (poi: POI) => {
      // Add to recent locations
      const updated = [poi, ...recentLocations.filter((p) => p.name !== poi.name)].slice(0, 5);
      setRecentLocations(updated);
      localStorage.setItem("recentRideLocations", JSON.stringify(updated));

      onSelect(poi);
      onClose();
    };

    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent ref={ref} side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Search input */}
            <div className="p-3 border-b">
              <Input
                placeholder="Cari lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg"
              />
            </div>

            {/* Current location button */}
            {showCurrentLocation && (
              <button
                onClick={() => {
                  onCurrentLocation?.();
                  onClose();
                }}
                className="flex items-center gap-3 p-4 hover:bg-muted border-b text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <Navigation2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Lokasi saya saat ini</p>
                  <p className="text-xs text-muted-foreground">Gunakan lokasi GPS</p>
                </div>
              </button>
            )}

            {/* Recent locations */}
            {recentLocations.length > 0 && search === "" && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Lokasi Terbaru
                </div>
                {recentLocations.map((poi) => (
                  <button
                    key={poi.name}
                    onClick={() => handleSelect(poi)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-muted text-left border-b"
                  >
                    <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{poi.name}</p>
                      <p className="text-xs text-muted-foreground">{poi.area}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* All POIs */}
            <div className="flex-1 overflow-y-auto">
              {search !== "" && (
                <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Hasil Pencarian
                </div>
              )}
              {filtered.map((poi) => (
                <button
                  key={poi.name}
                  onClick={() => handleSelect(poi)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-muted text-left border-b"
                >
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{poi.name}</p>
                    <p className="text-xs text-muted-foreground">{poi.area}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && search !== "" && (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">Lokasi tidak ditemukan</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

LocationPicker.displayName = "LocationPicker";
