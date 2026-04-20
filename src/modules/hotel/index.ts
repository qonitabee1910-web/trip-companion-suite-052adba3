/**
 * Hotel module manifest.
 */
import { Hotel } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import { lazyEl } from "@/shared/lazyEl";
import { hydrateHotels } from "./data/cloudStore";

const hotelModule: AppModule = {
  id: "hotel",
  label: "Hotel",
  icon: Hotel,
  color: "hotel",
  enabled: true,
  homePath: "/hotel",
  homeEntry: { order: 10 },
  routes: [
    { path: "/hotel", element: lazyEl(() => import("./pages/HotelHome")) },
    { path: "/hotel/search", element: lazyEl(() => import("./pages/HotelSearch")) },
    { path: "/hotel/:id", element: lazyEl(() => import("./pages/HotelDetail")) },
    { path: "/hotel/:id/book", element: lazyEl(() => import("./pages/HotelBooking")) },
  ],
  hydrate: hydrateHotels,
};

export default hotelModule;
