import { Hotel, Bus, Car, Plane, Train, Ticket, CreditCard, Sparkles, Navigation } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ModuleEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  color: "hotel" | "shuttle" | "ride" | "primary" | "accent";
  enabled: boolean;
}

// Add new modules here — they will appear in home grid automatically.
export const MODULES: ModuleEntry[] = [
  { id: "hotel", label: "Hotel", icon: Hotel, path: "/hotel", color: "hotel", enabled: true },
  { id: "shuttle", label: "Shuttle", icon: Bus, path: "/shuttle", color: "shuttle", enabled: true },
  { id: "ride", label: "Ride", icon: Car, path: "/ride", color: "ride", enabled: true },
  { id: "driver", label: "Driver", icon: Navigation, path: "/driver", color: "primary", enabled: true },
  { id: "flight", label: "Pesawat", icon: Plane, path: "#", color: "primary", enabled: false },
  { id: "train", label: "Kereta", icon: Train, path: "#", color: "accent", enabled: false },
  { id: "events", label: "Atraksi", icon: Ticket, path: "#", color: "accent", enabled: false },
  { id: "bills", label: "Tagihan", icon: CreditCard, path: "#", color: "primary", enabled: false },
  { id: "more", label: "Lainnya", icon: Sparkles, path: "#", color: "primary", enabled: false },
];
