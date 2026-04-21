import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Rayon, PickupPoint } from "../data/rayons";
import { getRoutingBetweenPoints, formatDistance, formatDuration } from "@/modules/admin/components/RoutingService";
import { Loader2, Navigation } from "lucide-react";

// Ensure default leaflet icons resolve under Vite
const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface RayonRouteMapProps {
  rayon: Rayon;
  selectedCode?: string;
  onSelect?: (code: string) => void;
  shiftedTimes?: Map<string, string>;
  height?: string;
}

function buildIcon(opts: { label: string; isSelected: boolean; isDest: boolean }): L.DivIcon {
  const { label, isSelected, isDest } = opts;
  const size = isSelected ? 36 : 28;
  const bg = isDest
    ? "hsl(var(--accent))"
    : isSelected
      ? "hsl(var(--primary))"
      : "hsl(var(--card))";
  const fg = isDest || isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))";
  const border = isSelected ? "hsl(var(--primary))" : "hsl(var(--border))";
  const ring = isSelected
    ? `box-shadow: 0 0 0 4px hsl(var(--primary) / 0.25), 0 2px 6px hsl(var(--foreground) / 0.2);`
    : `box-shadow: 0 1px 3px hsl(var(--foreground) / 0.25);`;
  const inner = isDest
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`
    : `<span style="font-size:${isSelected ? 12 : 11}px;font-weight:700;color:${fg};line-height:1;">${label}</span>`;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;${ring}">${inner}</div>`;
  return L.divIcon({
    html,
    className: "rayon-route-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, points]);
  return null;
}

function PanToSelected({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const targetZoom = Math.max(map.getZoom(), 14);
    map.flyTo(target, targetZoom, { duration: 0.6 });
  }, [map, target?.[0], target?.[1]]);
  return null;
}

function RoutingPolylines({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const [routing, setRouting] = useState<any>(null);

  useEffect(() => {
    if (points.length < 2) {
      setRouting(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const result = await getRoutingBetweenPoints(points);
        setRouting(result);
      } catch (error) {
        console.error("Routing fetch error:", error);
        setRouting(null);
      }
    };

    const timer = setTimeout(fetchRoute, 500);
    return () => clearTimeout(timer);
  }, [points]);

  if (!routing) return null;

  return (
    <>
      {routing.segments.map((seg, idx) => (
        <Polyline
          key={`route-${idx}`}
          positions={seg.coordinates}
          pathOptions={{
            color: "hsl(var(--primary))",
            weight: 3,
            opacity: 0.7,
            dashArray: "5, 5",
          }}
        />
      ))}
    </>
  );
}

export const RayonRouteMap = ({
  rayon,
  selectedCode,
  onSelect,
  shiftedTimes,
  height = "320px",
}: RayonRouteMapProps) => {
  const points = useMemo(
    () =>
      (rayon.pickupPoints || []).filter(
        (p): p is PickupPoint & { lat: number; lng: number } =>
          typeof p.lat === "number" && typeof p.lng === "number",
      ),
    [rayon],
  );

  const polyline: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const selectedPoint = points.find((p) => p.code === selectedCode);
  const selectedTarget: [number, number] | null = selectedPoint
    ? [selectedPoint.lat, selectedPoint.lng]
    : null;

  const [routing, setRouting] = useState<any>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (points.length < 2) {
      setRouting(null);
      return;
    }

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const coordPoints = points.map((p) => ({
          lat: p.lat,
          lng: p.lng,
        }));
        const result = await getRoutingBetweenPoints(coordPoints);
        setRouting(result);
      } catch (error) {
        console.error("Routing fetch error:", error);
        setRouting(null);
      } finally {
        setLoadingRoute(false);
      }
    };

    const timer = setTimeout(fetchRoute, 500);
    return () => clearTimeout(timer);
  }, [points]);

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="rounded-lg border bg-muted/40 flex items-center justify-center text-sm text-muted-foreground"
      >
        Koordinat titik jemput belum tersedia.
      </div>
    );
  }

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border relative z-0">
      <MapContainer
        center={polyline[0]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={polyline} />
        <PanToSelected target={selectedTarget} />

        {/* Static polyline connecting points */}
        <Polyline
          positions={polyline}
          pathOptions={{ color: "hsl(var(--card))", weight: 2, opacity: 0.4 }}
        />

        {/* Routing polylines with actual road network */}
        <RoutingPolylines points={points} />

        {/* Markers */}
        {points.map((p, idx) => {
          const isDest = p.code === "DEST";
          const isSelected = selectedCode === p.code;
          const label = isDest ? "" : String(idx + 1);
          const time = shiftedTimes?.get(p.code) || p.time;
          return (
            <Marker
              key={p.code}
              position={[p.lat, p.lng]}
              icon={buildIcon({ label, isSelected, isDest })}
              eventHandlers={{
                click: () => {
                  if (!isDest && onSelect) onSelect(p.code);
                },
              }}
            >
              <Popup>
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.code} · {time || "—"}
                  </div>
                  {!isDest && (
                    <button
                      type="button"
                      onClick={() => onSelect?.(p.code)}
                      className="text-xs text-primary underline mt-1"
                    >
                      {isSelected ? "Titik terpilih" : "Pilih titik ini"}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Routing info overlay */}
      {routing && (
        <div className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur-sm rounded-lg border border-border px-3 py-2 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">{formatDistance(routing.totalDistance)}</div>
              <div className="text-muted-foreground">±{formatDuration(routing.totalDuration)}</div>
            </div>
          </div>
        </div>
      )}

      {loadingRoute && (
        <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg border border-border px-3 py-2 text-xs shadow-lg flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-muted-foreground">Menghitung rute...</span>
        </div>
      )}
    </div>
  );
};
