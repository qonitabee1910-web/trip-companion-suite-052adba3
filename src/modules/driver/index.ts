/**
 * Driver module manifest.
 */
import { createElement } from "react";
import { Navigation } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import DriverLogin from "./pages/DriverLogin";
import DriverHome from "./pages/DriverHome";
import DriverActiveRide from "./pages/DriverActiveRide";
import DriverShuttleTrip from "./pages/DriverShuttleTrip";

const driverModule: AppModule = {
  id: "driver",
  label: "Driver",
  icon: Navigation,
  color: "primary",
  enabled: true,
  homePath: "/driver",
  homeEntry: { order: 40 },
  routes: [
    { path: "/driver/login", element: createElement(DriverLogin) },
    { path: "/driver", element: createElement(DriverHome) },
    { path: "/driver/ride/:id", element: createElement(DriverActiveRide) },
    { path: "/driver/shuttle", element: createElement(DriverShuttleTrip) },
    { path: "/driver/shuttle/:id", element: createElement(DriverShuttleTrip) },
  ],
};

export default driverModule;
