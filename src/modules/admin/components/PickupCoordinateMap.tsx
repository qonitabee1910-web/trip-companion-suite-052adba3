import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { Search, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
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

function PanController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [target]);
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

  // Geocoding state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch with localStorage cache
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    const cacheKey = `nominatim:${q.toLowerCase()}`;
    // Try cache first (TTL 7 days)
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: NominatimResult[] };
        const TTL = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.ts < TTL) {
          setResults(parsed.data);
          setOpen(true);
          setLoading(false);
          return;
        }
        localStorage.removeItem(cacheKey);
      }
    } catch {
      // ignore cache read errors
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=id&addressdetails=1`;
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Geocoding gagal");
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(true);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
        } catch {
          // quota exceeded — best effort eviction of oldest nominatim entries
          try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith("nominatim:")) keys.push(k);
            }
            keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => localStorage.removeItem(k));
            localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
          } catch {
            // give up silently
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Nominatim error", err);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  // Click-outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pickResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    setPanTarget([lat, lon]);
    if (activeCode) {
      onCapture(activeCode, lat, lon);
      setQuery("");
      setResults([]);
      setOpen(false);
    } else {
      toast({
        title: "Belum ada titik aktif",
        description: "Klik tombol crosshair pada baris di tabel untuk pilih titik yang akan di-capture.",
      });
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      pickResult(results[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Cari alamat... (cth: Hermes Palace Medan)"
            className="w-full pl-9 pr-9 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              aria-label="Clear"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : null}
        </div>
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-[1000] bg-popover border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
            {results.map((r) => {
              const primary = r.display_name.split(",")[0];
              return (
                <button
                  key={r.place_id}
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground border-b border-border last:border-0 transition-colors"
                >
                  <div className="text-sm font-semibold truncate">{primary}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{r.display_name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {parseFloat(r.lat).toFixed(5)}, {parseFloat(r.lon).toFixed(5)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {open && !loading && query.trim().length >= 3 && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-[1000] bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-xs text-muted-foreground">
            Tidak ada hasil untuk "{query}"
          </div>
        )}
      </div>

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
          <PanController target={panTarget} />
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
    </div>
  );
};
