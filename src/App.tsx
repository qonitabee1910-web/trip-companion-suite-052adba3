import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound.tsx";

import HotelHome from "./modules/hotel/pages/HotelHome";
import HotelSearch from "./modules/hotel/pages/HotelSearch";
import HotelDetail from "./modules/hotel/pages/HotelDetail";
import HotelBooking from "./modules/hotel/pages/HotelBooking";

import ShuttleHome from "./modules/shuttle/pages/ShuttleHome";
import ShuttleSearch from "./modules/shuttle/pages/ShuttleSearch";
import ShuttleBooking from "./modules/shuttle/pages/ShuttleBooking";
import SeatLayoutEditor from "./modules/shuttle/pages/SeatLayoutEditor";
import ShuttleRayon from "./modules/shuttle/pages/ShuttleRayon";
import ShuttleService from "./modules/shuttle/pages/ShuttleService";
import ShuttleVehicle from "./modules/shuttle/pages/ShuttleVehicle";

import RideHome from "./modules/ride/pages/RideHome";

import DriverLogin from "./modules/driver/pages/DriverLogin";
import DriverHome from "./modules/driver/pages/DriverHome";
import DriverActiveRide from "./modules/driver/pages/DriverActiveRide";
import DriverShuttleTrip from "./modules/driver/pages/DriverShuttleTrip";

import AdminDashboard from "./modules/admin/pages/AdminDashboard";
import AdminRayons from "./modules/admin/pages/AdminRayons";
import AdminServices from "./modules/admin/pages/AdminServices";
import AdminVehicles from "./modules/admin/pages/AdminVehicles";
import AdminBookings from "./modules/admin/pages/AdminBookings";
import AdminScan from "./modules/admin/pages/AdminScan";
import AdminSeatEditor from "./modules/admin/pages/AdminSeatEditor";
import AdminShuttleContent from "./modules/admin/pages/AdminShuttleContent";
import AdminInventory from "./modules/admin/pages/AdminInventory";

import { CloudGate } from "./shared/components/CloudGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CloudGate>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/hotel" element={<HotelHome />} />
          <Route path="/hotel/search" element={<HotelSearch />} />
          <Route path="/hotel/:id" element={<HotelDetail />} />
          <Route path="/hotel/:id/book" element={<HotelBooking />} />

          <Route path="/shuttle" element={<ShuttleHome />} />
          <Route path="/shuttle/rayon/:id" element={<ShuttleRayon />} />
          <Route path="/shuttle/service" element={<ShuttleService />} />
          <Route path="/shuttle/vehicle" element={<ShuttleVehicle />} />
          <Route path="/shuttle/book" element={<ShuttleBooking />} />
          <Route path="/shuttle/search" element={<ShuttleSearch />} />
          <Route path="/shuttle/seat-editor" element={<SeatLayoutEditor />} />
          <Route path="/shuttle/:id/book" element={<ShuttleBooking />} />

          <Route path="/ride" element={<RideHome />} />

          <Route path="/driver/login" element={<DriverLogin />} />
          <Route path="/driver" element={<DriverHome />} />
          <Route path="/driver/ride/:id" element={<DriverActiveRide />} />
          <Route path="/driver/shuttle" element={<DriverShuttleTrip />} />
          <Route path="/driver/shuttle/:id" element={<DriverShuttleTrip />} />

          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/shuttle/rayons" element={<AdminRayons />} />
          <Route path="/admin/shuttle/services" element={<AdminServices />} />
          <Route path="/admin/shuttle/vehicles" element={<AdminVehicles />} />
          <Route path="/admin/shuttle/bookings" element={<AdminBookings />} />
          <Route path="/admin/shuttle/scan" element={<AdminScan />} />
          <Route path="/admin/shuttle/seat-editor" element={<AdminSeatEditor />} />
          <Route path="/admin/shuttle/content" element={<AdminShuttleContent />} />
          <Route path="/admin/shuttle/inventory" element={<AdminInventory />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
