import React from "react";
import { MapPin, Building2, MapIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GeocodeInfoDisplayProps {
  address?: string;
  landmark?: string;
  neighborhood?: string;
  city?: string;
  loading?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Display detailed geocoding information for a location
 */
export const GeocodeInfoDisplay = React.forwardRef<HTMLDivElement, GeocodeInfoDisplayProps>(
  (
    {
      address,
      landmark,
      neighborhood,
      city,
      loading = false,
      compact = false,
      className = "",
    },
    ref
  ) => {
    if (!address && !loading) return null;

    if (compact) {
      return (
        <div ref={ref} className={`text-xs text-muted-foreground ${className}`}>
          {loading ? (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Mencari lokasi...</span>
            </div>
          ) : (
            <>
              {address && <p className="line-clamp-1">{address}</p>}
              {landmark && <p className="line-clamp-1 text-primary font-medium">{landmark}</p>}
            </>
          )}
        </div>
      );
    }

    return (
      <Card ref={ref} className={`p-4 space-y-3 ${className}`}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Mendapatkan detail lokasi...</span>
          </div>
        ) : (
          <>
            {/* Full Address */}
            {address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Alamat</p>
                  <p className="text-sm font-medium">{address}</p>
                </div>
              </div>
            )}

            {/* Landmark/Nearby POI */}
            {landmark && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Landmark Terdekat</p>
                  <p className="text-sm font-medium">{landmark}</p>
                </div>
              </div>
            )}

            {/* Location Tags */}
            {(neighborhood || city) && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {neighborhood && (
                  <Badge variant="secondary" className="text-xs">
                    {neighborhood}
                  </Badge>
                )}
                {city && (
                  <Badge variant="outline" className="text-xs">
                    {city}
                  </Badge>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    );
  }
);

GeocodeInfoDisplay.displayName = "GeocodeInfoDisplay";

/**
 * Display multiple geocoded results as a list
 */
export const GeocodeResultsList = React.forwardRef<
  HTMLDivElement,
  {
    results: Array<{
      name: string;
      address: string;
      lat: number;
      lng: number;
    }>;
    loading?: boolean;
    onSelect?: (result: { name: string; lat: number; lng: number }) => void;
    className?: string;
  }
>(({ results, loading = false, onSelect, className = "" }, ref) => {
  if (loading) {
    return (
      <div ref={ref} className={`p-4 text-center ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-sm text-muted-foreground">Mencari lokasi...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className={`space-y-2 ${className}`}>
      {results.map((result, idx) => (
        <button
          key={`result-${idx}`}
          onClick={() => onSelect?.(result)}
          className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left"
        >
          <MapIcon className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{result.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{result.address}</p>
          </div>
        </button>
      ))}
    </div>
  );
});

GeocodeResultsList.displayName = "GeocodeResultsList";
