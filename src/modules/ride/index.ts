/**
 * Ride module manifest.
 */
import { createElement } from "react";
import { Car } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import RideHome from "./pages/RideHome";

const rideModule: AppModule = {
  id: "ride",
  label: "Ride",
  icon: Car,
  color: "ride",
  enabled: true,
  homePath: "/ride",
  homeEntry: { order: 30 },
  routes: [
    { path: "/ride", element: createElement(RideHome) },
  ],
};

export default rideModule;
