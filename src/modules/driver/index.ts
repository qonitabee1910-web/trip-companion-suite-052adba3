/**
 * Driver module manifest.
 */
import { Navigation } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import { lazyEl } from "@/shared/lazyEl";

const driverModule: AppModule = {
  id: "driver",
  label: "Driver",
  icon: Navigation,
  color: "primary",
  enabled: true,
  homePath: "/driver",
  homeEntry: { order: 40 },
  routes: [
    { path: "/driver/login", element: lazyEl(() => import("./pages/DriverLogin")) },
    { path: "/driver", element: lazyEl(() => import("./pages/DriverHome")) },
    { path: "/driver/ride/:id", element: lazyEl(() => import("./pages/DriverActiveRide")) },
    { path: "/driver/shuttle", element: lazyEl(() => import("./pages/DriverShuttleTrip")) },
    { path: "/driver/shuttle/:id", element: lazyEl(() => import("./pages/DriverShuttleTrip")) },
  ],
};

export default driverModule;
