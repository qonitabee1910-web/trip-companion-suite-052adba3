import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { PickupPoint } from "@/modules/shuttle/data/rayons";

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

interface PickupCoordinateMapProps {
  points: PickupPoint[];
  activeCode: string | null;
  onCapture: (code: string, lat: number, lng: number) => void;
  onDragMarker: (code: string, lat: number, lng: number) => void;
  height?: string;
  fitSignal?: number;
}

const MEDAN_CENTER: [number, number] = [3.5852, 98.6722];

function buildIcon(label: string, isDest: boolean, isActive: boolean): L.DivIcon {
  const size = isActive ? 36 : 28;
  const bg = isDest
    ? "hsl(var(--accent))"
    : isActive
    ? "hsl(var(--primary))"
    : "hsl(var(--card))";
  const fg = isDest || isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))";
  const border = isActive ? "hsl(var(--primary))" : "hsl(var(--border))";
  const ring = isActive
    ? `box-shadow: 0 0 0 4px hsl(var(--primary) / 0.25), 0 2px 6px hsl(var(--foreground) / 0.2);`
    : `box-shadow: 0 1px 3px hsl(var(--foreground) / 0.25);`;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;${ring}"><span style="font-size:${isActive ? 12 : 11}px;font-weight:700;color:${fg};line-height:1;">${label}</span></div>`;
  return L.divIcon({
    html,
    className: "pickup-capture-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function ClickCapture({ activeCode, onCapture }: { activeCode: string | null; onCapture: (code: string, lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!activeCode) return;
      onCapture(activeCode, e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBoundsBtn({ points, signal }: { points: [number, number][]; signal?: number }) {
  const map = useMap();
  useEffect(() => {
    if (signal === undefined) return;
    if (points.length === 0) {
      map.setView(MEDAN_CENTER, 12);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [signal]);
  return null;
}

export const PickupCoordinateMap = ({
  points,
  activeCode,
  onCapture,
  onDragMarker,
  height = "360px",
  fitSignal,
}: PickupCoordinateMapProps) => {
  const withCoords = useMemo(
    () =>
      points
        .map((p, idx) => ({ p, idx }))
        .filter(({ p }) => typeof p.lat === "number" && typeof p.lng === "number"),
    [points],
  );
  const polyline: [number, number][] = withCoords.map(({ p }) => [p.lat as number, p.lng as number]);
  const initialCenter: [number, number] = polyline[0] ?? MEDAN_CENTER;

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border relative z-0">
      <MapContainer
        center={initialCenter}
        zoom={polyline.length > 0 ? 13 : 12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture activeCode={activeCode} onCapture={onCapture} />
        <FitBoundsBtn points={polyline} signal={fitSignal} />
        {polyline.length >= 2 && (
          <Polyline
            positions={polyline}
            pathOptions={{ color: "hsl(217 91% 60%)", weight: 4, opacity: 0.85 }}
          />
        )}
        {withCoords.map(({ p, idx }) => {
          const isDest = p.code === "DEST";
          const realIdx = points.slice(0, idx).filter((x) => x.code !== "DEST").length;
          const label = isDest ? "★" : String(realIdx + 1);
          const isActive = activeCode === p.code;
          return (
            <Marker
              key={p.code + idx}
              position={[p.lat as number, p.lng as number]}
              icon={buildIcon(label, isDest, isActive)}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  onDragMarker(p.code, ll.lat, ll.lng);
                },
              }}
            >
              <Popup>
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm">{p.code} · {p.name || "(tanpa nama)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {(p.lat as number).toFixed(5)}, {(p.lng as number).toFixed(5)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Drag marker untuk koreksi posisi.</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
