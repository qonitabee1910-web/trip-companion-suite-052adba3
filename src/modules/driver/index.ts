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
    { path: "/driver", element: lazyEl(() => import("./pages/DriverHome")), requireRole: "driver", requireVerified: true },
    { path: "/driver/profile", element: lazyEl(() => import("./pages/DriverProfile")), requireRole: "driver" },
    { path: "/driver/ride/:id", element: lazyEl(() => import("./pages/DriverActiveRide")), requireRole: "driver", requireVerified: true },
    { path: "/driver/shuttle", element: lazyEl(() => import("./pages/DriverShuttleTrip")), requireRole: "driver", requireVerified: true },
    { path: "/driver/shuttle/:id", element: lazyEl(() => import("./pages/DriverShuttleTrip")), requireRole: "driver", requireVerified: true },
  ],
};

export default driverModule;
