/**
 * Admin shell module — provides the admin dashboard root + login.
 * Domain-specific admin routes (shuttle, etc.) live inside their own modules
 * and are aggregated by AdminSidebar via the registry.
 */
import { LayoutDashboard, Shield } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import { lazyEl } from "@/shared/lazyEl";

const adminModule: AppModule = {
  id: "admin",
  label: "Admin",
  icon: Shield,
  color: "primary",
  enabled: false, // not shown on home grid
  routes: [
    { path: "/admin/login", element: lazyEl(() => import("./pages/AdminLogin")) },
  ],
  adminRoutes: [
    {
      path: "/admin",
      element: lazyEl(() => import("./pages/AdminDashboard")),
      sidebar: { label: "Dashboard", icon: LayoutDashboard, group: "Operasional", order: 10, end: true },
    },
  ],
};

export default adminModule;
