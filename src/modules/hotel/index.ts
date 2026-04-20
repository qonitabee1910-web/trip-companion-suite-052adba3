/**
 * Hotel module manifest.
 */
import { createElement } from "react";
import { Hotel } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import HotelHome from "./pages/HotelHome";
import HotelSearch from "./pages/HotelSearch";
import HotelDetail from "./pages/HotelDetail";
import HotelBooking from "./pages/HotelBooking";
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
    { path: "/hotel", element: createElement(HotelHome) },
    { path: "/hotel/search", element: createElement(HotelSearch) },
    { path: "/hotel/:id", element: createElement(HotelDetail) },
    { path: "/hotel/:id/book", element: createElement(HotelBooking) },
  ],
  hydrate: hydrateHotels,
};

export default hotelModule;
