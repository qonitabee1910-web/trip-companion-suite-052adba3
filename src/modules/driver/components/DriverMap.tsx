import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(var(--primary));width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

interface Pt {
  lat: number;
  lng: number;
}

interface Props {
  driver?: Pt | null;
  pickup?: Pt | null;
  dest?: Pt | null;
  height?: string;
}

const Recenter = ({ pos }: { pos: Pt | null | undefined }) => {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], map.getZoom() < 13 ? 14 : map.getZoom(), { animate: true });
  }, [pos?.lat, pos?.lng]);
  return null;
};

export const DriverMap = ({ driver, pickup, dest, height = "100%" }: Props) => {
  const center = driver ?? pickup ?? dest ?? { lat: -6.1937, lng: 106.823 };
  const line: [number, number][] = [];
  if (driver) line.push([driver.lat, driver.lng]);
  if (pickup) line.push([pickup.lat, pickup.lng]);
  if (dest) line.push([dest.lat, dest.lng]);

  return (
    <div style={{ height }} className="w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {driver && <Marker position={[driver.lat, driver.lng]} icon={driverIcon} />}
        {pickup && <Marker position={[pickup.lat, pickup.lng]} />}
        {dest && <Marker position={[dest.lat, dest.lng]} />}
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "hsl(var(--primary))", weight: 4 }} />}
        <Recenter pos={driver} />
      </MapContainer>
    </div>
  );
};
