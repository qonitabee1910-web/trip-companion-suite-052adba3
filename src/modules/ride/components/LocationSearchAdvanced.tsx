import React, { useEffect, useState } from "react";
import {
  MapPin,
  Navigation2,
  Trash2,
  Search,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  useLocationSearch,
  type SearchResultWithMetrics,
} from "../hooks/useLocationSearch";
import { SearchResultCard, SearchResultsList, SearchSuggestionChips } from "./SearchResultCard";
import { POIS } from "../data/ride";
import type { POI } from "../data/ride";

interface LocationSearchAdvancedProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: POI) => void;
  title: string;
  showCurrentLocation?: boolean;
  onCurrentLocation?: () => void;
  userLat?: number;
  userLng?: number;
  placeholder?: string;
}

/**
 * Advanced location search component with suggestions and history
 */
export const LocationSearchAdvanced = React.forwardRef<
  HTMLDivElement,
  LocationSearchAdvancedProps
>(
  (
    {
      open,
      onClose,
      onSelect,
      title,
      showCurrentLocation = false,
      onCurrentLocation,
      userLat,
      userLng,
      placeholder = "Cari lokasi atau masukkan alamat...",
    },
    ref
  ) => {
    const {
      query,
      results,
      loading,
      error,
      search,
      selectResult,
      clearSearch,
      searchHistory,
      clearHistory,
      removeFromHistory,
      suggestions,
      nearbyLocations,
      cleanup,
    } = useLocationSearch(userLat, userLng);

    const [activeTab, setActiveTab] = useState<"search" | "history" | "nearby">("search");
    const [recentLocations, setRecentLocations] = useState<POI[]>([]);

    // Load recent locations from localStorage
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
      return () => cleanup();
    }, [cleanup]);

    const handleSelectResult = (result: SearchResultWithMetrics) => {
      const poi = selectResult(result);
      if (poi) {
        onSelect(poi);
        onClose();
      }
    };

    const handleSelectHistoryEntry = (entry: (typeof searchHistory)[0]) => {
      const poi: POI = {
        name: entry.address.split(",")[0],
        lat: entry.lat,
        lng: entry.lng,
        area: entry.address.split(",").slice(-2).join(",").trim(),
      };
      onSelect(poi);
      onClose();
    };

    const handleSelectPOI = (poi: POI) => {
      onSelect(poi);
      onClose();
    };

    const showResults = query.length > 0 && results.length > 0;
    const showSuggestions =
      query.length === 0 && suggestions.length > 0;
    const showNearby = query.length === 0 && nearbyLocations.length > 0 && activeTab === "nearby";

    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent ref={ref} side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>{title}</span>
              {searchHistory.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                >
                  Hapus riwayat
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            {/* Search Input */}
            <div className="px-4 pt-2">
              <div className="relative">
                <Input
                  autoFocus
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  className="pl-10 pr-8 py-2.5"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Current Location Button */}
            {showCurrentLocation && query === "" && (
              <div className="px-4">
                <button
                  onClick={() => {
                    onCurrentLocation?.();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Navigation2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Lokasi saya saat ini</p>
                    <p className="text-xs text-muted-foreground">Gunakan lokasi GPS</p>
                  </div>
                </button>
              </div>
            )}

            {/* Tabs for History/Nearby */}
            {query === "" && searchHistory.length > 0 && (
              <div className="px-4 flex gap-2">
                {suggestions.length > 0 && (
                  <Button
                    variant={activeTab === "search" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("search")}
                    className="text-xs"
                  >
                    Saran
                  </Button>
                )}
                {searchHistory.length > 0 && (
                  <Button
                    variant={activeTab === "history" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("history")}
                    className="text-xs"
                  >
                    Riwayat ({searchHistory.length})
                  </Button>
                )}
                {nearbyLocations.length > 0 && (
                  <Button
                    variant={activeTab === "nearby" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("nearby")}
                    className="text-xs"
                  >
                    Dekat sini
                  </Button>
                )}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3">
              {/* Search Results */}
              {showResults && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Hasil Pencarian
                  </p>
                  <SearchResultsList
                    results={results}
                    loading={loading}
                    error={error}
                    onResultSelect={handleSelectResult}
                    showCategory
                    showDistance
                  />
                </div>
              )}

              {/* Search Loading/Error State */}
              {query && !showResults && (loading || error) && (
                <div className="p-4 text-center">
                  {loading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Mencari lokasi...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-yellow-600 mb-2">{error}</p>
                      <p className="text-xs text-muted-foreground">
                        Coba dengan nama yang lebih spesifik atau gunakan POI populer
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Suggestions Tab */}
              {activeTab === "search" && !query && suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Saran Untuk Anda
                  </p>
                  <SearchResultsList
                    results={suggestions}
                    onResultSelect={handleSelectResult}
                    showCategory
                    emptyMessage="Tidak ada saran"
                  />
                </div>
              )}

              {/* History Tab */}
              {activeTab === "history" && searchHistory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Pencarian Terbaru
                  </p>
                  <div className="space-y-2">
                    {searchHistory.slice(0, 10).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted group transition-colors"
                      >
                        <button
                          onClick={() => handleSelectHistoryEntry(entry)}
                          className="flex-1 flex items-start gap-2 text-left"
                        >
                          <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">
                              {entry.address.split(",")[0]}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {entry.address.split(",").slice(-2).join(",")}
                            </p>
                            {entry.count > 1 && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {entry.count}x
                              </Badge>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => removeFromHistory(entry.id)}
                          className="flex-shrink-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby Tab */}
              {showNearby && nearbyLocations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Lokasi Dekat Anda
                  </p>
                  <SearchResultsList
                    results={nearbyLocations}
                    onResultSelect={handleSelectResult}
                    showDistance
                    showCategory
                  />
                </div>
              )}

              {/* Built-in POIs */}
              {!query && activeTab === "search" && suggestions.length === 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Lokasi Populer
                  </p>
                  <div className="space-y-2">
                    {POIS.slice(0, 8).map((poi) => (
                      <button
                        key={poi.name}
                        onClick={() => handleSelectPOI(poi)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left"
                      >
                        <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{poi.name}</p>
                          <p className="text-xs text-muted-foreground">{poi.area}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Locations from rides */}
              {!query && recentLocations.length > 0 && activeTab === "search" && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Lokasi Terbaru
                  </p>
                  <div className="space-y-2">
                    {recentLocations.map((poi) => (
                      <button
                        key={`recent-${poi.name}`}
                        onClick={() => handleSelectPOI(poi)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left"
                      >
                        <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{poi.name}</p>
                          <p className="text-xs text-muted-foreground">{poi.area}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

LocationSearchAdvanced.displayName = "LocationSearchAdvanced";
