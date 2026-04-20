/**
 * Ride module manifest.
 */
import { Car } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import { lazyEl } from "@/shared/lazyEl";

const rideModule: AppModule = {
  id: "ride",
  label: "Ride",
  icon: Car,
  color: "ride",
  enabled: true,
  homePath: "/ride",
  homeEntry: { order: 30 },
  routes: [
    { path: "/ride", element: lazyEl(() => import("./pages/RideHome")) },
  ],
};

export default rideModule;
