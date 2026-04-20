import React, { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// Fix default leaflet marker icons (Vite doesn't bundle them by default)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

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

interface MiniMapProps {
  lat: number;
  lng: number;
  label?: string;
  height?: string;
  zoom?: number;
}

export const MiniMap = ({ lat, lng, label, height = "200px", zoom = 14 }: MiniMapProps) => {
  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border">
      <MapContainer center={[lat, lng]} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>{label && <Popup>{label}</Popup>}</Marker>
      </MapContainer>
    </div>
  );
};
