import React, { useState, useEffect } from "react";
import { MapPin, Navigation2, Clock, Loader2, AlertCircle, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { POIS } from "../data/ride";
import { useGeocodeAutocomplete, useForwardGeocode } from "../hooks/useGeocoding";
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
    const [showGeocodeResults, setShowGeocodeResults] = useState(false);

    // Hooks for geocoding
    const {
      results: autocompleteResults,
      loading: autocompleteLoading,
      error: autocompleteError,
      search: performAutocomplete,
      cleanup: cleanupAutocomplete,
    } = useGeocodeAutocomplete();

    const {
      results: geocodeResults,
      loading: geocodeLodaing,
      error: geocodeError,
      geocode,
    } = useForwardGeocode();

    // Load recent locations from localStorage on mount
    useEffect(() => {
      const stored = localStorage.getItem("recentRideLocations");
      if (stored) {
        try {
          setRecentLocations(JSON.parse(stored));
        } catch (e) {
          console.error("Error loading recent locations:", e);
        }
      }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        cleanupAutocomplete();
      };
    }, [cleanupAutocomplete]);

    // Handle search input
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);
      setShowGeocodeResults(value.length > 0);

      if (value.length >= 2) {
        // Use autocomplete for live suggestions
        performAutocomplete(value);
      } else {
        // Clear results if search is empty
        setShowGeocodeResults(false);
      }
    };

    // Filter built-in POIs
    const filteredPois = POIS.filter(
      (poi) =>
        poi.name.toLowerCase().includes(search.toLowerCase()) ||
        poi.area.toLowerCase().includes(search.toLowerCase())
    );

    // Handle POI selection
    const handleSelect = (poi: POI) => {
      const updated = [poi, ...recentLocations.filter((p) => p.name !== poi.name)].slice(0, 5);
      setRecentLocations(updated);
      localStorage.setItem("recentRideLocations", JSON.stringify(updated));

      onSelect(poi);
      onClose();
    };

    // Handle geocode result selection
    const handleGeocodeResultSelect = (result: (typeof autocompleteResults)[0]) => {
      const poi: POI = {
        name: result.name,
        lat: result.lat,
        lng: result.lng,
        area: result.address.split(",").slice(-2).join(",").trim(),
      };

      handleSelect(poi);
    };

    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent ref={ref} side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Search input with geocoding */}
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Input
                  placeholder="Cari lokasi atau masukkan alamat..."
                  value={search}
                  onChange={handleSearchChange}
                  className="rounded-lg"
                />
                {(autocompleteLoading || geocodeLodaing) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Geocoding error message */}
              {(autocompleteError || geocodeError) && (
                <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{autocompleteError || geocodeError}</span>
                </div>
              )}
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

            {/* Geocoding autocomplete results */}
            {showGeocodeResults && autocompleteResults && autocompleteResults.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  Hasil Pencarian Alamat
                </div>
                {autocompleteResults.map((result, idx) => (
                  <button
                    key={`geocode-${idx}`}
                    onClick={() => handleGeocodeResultSelect(result)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-muted text-left border-b transition-colors"
                  >
                    <MapIcon className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{result.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{result.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent locations */}
            {!showGeocodeResults && recentLocations.length > 0 && search === "" && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  Lokasi Terbaru
                </div>
                {recentLocations.map((poi) => (
                  <button
                    key={`recent-${poi.name}`}
                    onClick={() => handleSelect(poi)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-muted text-left border-b transition-colors"
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

            {/* Built-in POIs list */}
            <div className="flex-1 overflow-y-auto">
              {!showGeocodeResults && (
                <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  {search ? "Hasil Pencarian" : "Lokasi Populer"}
                </div>
              )}
              {!showGeocodeResults && filteredPois.map((poi) => (
                <button
                  key={`poi-${poi.name}`}
                  onClick={() => handleSelect(poi)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-muted text-left border-b transition-colors"
                >
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{poi.name}</p>
                    <p className="text-xs text-muted-foreground">{poi.area}</p>
                  </div>
                </button>
              ))}

              {/* No results message */}
              {!showGeocodeResults && search && filteredPois.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">Lokasi tidak ditemukan</p>
                  <p className="text-xs mt-1">Coba cari dengan alamat lengkap</p>
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
