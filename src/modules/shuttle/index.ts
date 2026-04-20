/**
 * Shuttle module manifest. Owns public shuttle pages + all shuttle admin pages.
 */
import { createElement } from "react";
import { Bus, MapPin, Sparkles, Ticket, Armchair, ScanLine, Image, PackageOpen } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";

import ShuttleHome from "./pages/ShuttleHome";
import ShuttleBooking from "./pages/ShuttleBooking";
import SeatLayoutEditor from "./pages/SeatLayoutEditor";
import ShuttleRayon from "./pages/ShuttleRayon";
import ShuttleService from "./pages/ShuttleService";
import ShuttleVehicle from "./pages/ShuttleVehicle";

import AdminRayons from "@/modules/admin/pages/AdminRayons";
import AdminServices from "@/modules/admin/pages/AdminServices";
import AdminVehicles from "@/modules/admin/pages/AdminVehicles";
import AdminBookings from "@/modules/admin/pages/AdminBookings";
import AdminScan from "@/modules/admin/pages/AdminScan";
import AdminSeatEditor from "@/modules/admin/pages/AdminSeatEditor";
import AdminShuttleContent from "@/modules/admin/pages/AdminShuttleContent";
import AdminInventory from "@/modules/admin/pages/AdminInventory";

import { ensureHydrated } from "./data/cloudStore";

const shuttleModule: AppModule = {
  id: "shuttle",
  label: "Shuttle",
  icon: Bus,
  color: "shuttle",
  enabled: true,
  homePath: "/shuttle",
  homeEntry: { order: 20 },
  routes: [
    { path: "/shuttle", element: createElement(ShuttleHome) },
    { path: "/shuttle/rayon/:id", element: createElement(ShuttleRayon) },
    { path: "/shuttle/service", element: createElement(ShuttleService) },
    { path: "/shuttle/vehicle", element: createElement(ShuttleVehicle) },
    { path: "/shuttle/book", element: createElement(ShuttleBooking) },
    { path: "/shuttle/seat-editor", element: createElement(SeatLayoutEditor) },
    { path: "/shuttle/:id/book", element: createElement(ShuttleBooking) },
  ],
  adminRoutes: [
    {
      path: "/admin/shuttle/content",
      element: createElement(AdminShuttleContent),
      sidebar: { label: "Beranda Shuttle", icon: Image, group: "Konten & Branding", order: 10 },
    },
    {
      path: "/admin/shuttle/rayons",
      element: createElement(AdminRayons),
      sidebar: { label: "Rayon & Jam", icon: MapPin, group: "Setup Layanan", order: 10 },
    },
    {
      path: "/admin/shuttle/services",
      element: createElement(AdminServices),
      sidebar: { label: "Service", icon: Sparkles, group: "Setup Layanan", order: 20 },
    },
    {
      path: "/admin/shuttle/vehicles",
      element: createElement(AdminVehicles),
      sidebar: { label: "Kendaraan", icon: Bus, group: "Setup Layanan", order: 30 },
    },
    {
      path: "/admin/shuttle/seat-editor",
      element: createElement(AdminSeatEditor),
      sidebar: { label: "Seat Layout", icon: Armchair, group: "Setup Layanan", order: 40 },
    },
    {
      path: "/admin/shuttle/bookings",
      element: createElement(AdminBookings),
      sidebar: { label: "Booking", icon: Ticket, group: "Operasional", order: 20 },
    },
    {
      path: "/admin/shuttle/scan",
      element: createElement(AdminScan),
      sidebar: { label: "Scan Tiket", icon: ScanLine, group: "Operasional", order: 30 },
    },
    {
      path: "/admin/shuttle/inventory",
      element: createElement(AdminInventory),
      sidebar: { label: "Inventori Kursi", icon: PackageOpen, group: "Operasional", order: 40 },
    },
  ],
  hydrate: async () => {
    await ensureHydrated();
  },
};

export default shuttleModule;
