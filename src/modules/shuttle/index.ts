/**
 * Shuttle module manifest. Owns public shuttle pages + all shuttle admin pages.
 * Pages are lazy-loaded so each chunk only ships when its route is hit.
 */
import { Bus, MapPin, Sparkles, Ticket, Armchair, ScanLine, Image, PackageOpen } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import { lazyEl } from "@/shared/lazyEl";
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
    { path: "/shuttle", element: lazyEl(() => import("./pages/ShuttleHome")) },
    { path: "/shuttle/rayon/:id", element: lazyEl(() => import("./pages/ShuttleRayon")) },
    { path: "/shuttle/service", element: lazyEl(() => import("./pages/ShuttleService")) },
    { path: "/shuttle/vehicle", element: lazyEl(() => import("./pages/ShuttleVehicle")) },
    { path: "/shuttle/book", element: lazyEl(() => import("./pages/ShuttleBooking")) },
    { path: "/shuttle/seat-editor", element: lazyEl(() => import("./pages/SeatLayoutEditor")) },
    { path: "/shuttle/:id/book", element: lazyEl(() => import("./pages/ShuttleBooking")) },
    { path: "/shuttle/login", element: lazyEl(() => import("./pages/CustomerLogin")) },
    { path: "/shuttle/my-bookings", element: lazyEl(() => import("./pages/MyBookings")) },
  ],
  adminRoutes: [
    {
      path: "/admin/shuttle/content",
      element: lazyEl(() => import("@/modules/admin/pages/AdminShuttleContent")),
      sidebar: { label: "Beranda Shuttle", icon: Image, group: "Konten & Branding", order: 10 },
    },
    {
      path: "/admin/shuttle/rayons",
      element: lazyEl(() => import("@/modules/admin/pages/AdminRayons")),
      sidebar: { label: "Rayon & Jam", icon: MapPin, group: "Setup Layanan", order: 10 },
    },
    {
      path: "/admin/shuttle/services",
      element: lazyEl(() => import("@/modules/admin/pages/AdminServices")),
      sidebar: { label: "Service", icon: Sparkles, group: "Setup Layanan", order: 20 },
    },
    {
      path: "/admin/shuttle/vehicles",
      element: lazyEl(() => import("@/modules/admin/pages/AdminVehicles")),
      sidebar: { label: "Kendaraan", icon: Bus, group: "Setup Layanan", order: 30 },
    },
    {
      path: "/admin/shuttle/seat-editor",
      element: lazyEl(() => import("@/modules/admin/pages/AdminSeatEditor")),
      sidebar: { label: "Seat Layout", icon: Armchair, group: "Setup Layanan", order: 40 },
    },
    {
      path: "/admin/shuttle/bookings",
      element: lazyEl(() => import("@/modules/admin/pages/AdminBookings")),
      sidebar: { label: "Booking", icon: Ticket, group: "Operasional", order: 20 },
    },
    {
      path: "/admin/shuttle/scan",
      element: lazyEl(() => import("@/modules/admin/pages/AdminScan")),
      sidebar: { label: "Scan Tiket", icon: ScanLine, group: "Operasional", order: 30 },
    },
    {
      path: "/admin/shuttle/inventory",
      element: lazyEl(() => import("@/modules/admin/pages/AdminInventory")),
      sidebar: { label: "Inventori Kursi", icon: PackageOpen, group: "Operasional", order: 40 },
    },
  ],
  hydrate: async () => {
    await ensureHydrated();
  },
};

export default shuttleModule;
