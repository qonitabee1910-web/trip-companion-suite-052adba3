/**
 * Admin shell module — provides the admin dashboard root + login.
 * Domain-specific admin routes (shuttle, etc.) live inside their own modules
 * and are aggregated by AdminSidebar via the registry.
 */
import { createElement } from "react";
import { LayoutDashboard, Shield } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";

const adminModule: AppModule = {
  id: "admin",
  label: "Admin",
  icon: Shield,
  color: "primary",
  enabled: false, // not shown on home grid
  routes: [
    { path: "/admin/login", element: createElement(AdminLogin) },
  ],
  adminRoutes: [
    {
      path: "/admin",
      element: createElement(AdminDashboard),
      sidebar: { label: "Dashboard", icon: LayoutDashboard, group: "Operasional", order: 10, end: true },
    },
  ],
};

export default adminModule;
