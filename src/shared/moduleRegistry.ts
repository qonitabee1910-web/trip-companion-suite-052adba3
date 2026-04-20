/**
 * Module registry — single source of truth for which modules ship in this app.
 *
 * To add a module: import its manifest and append to MODULES.
 */
import type { AppModule } from "./moduleSystem";
import { Plane, Train, Ticket, CreditCard, Sparkles } from "lucide-react";

import hotelModule from "@/modules/hotel";
import shuttleModule from "@/modules/shuttle";
import rideModule from "@/modules/ride";
import driverModule from "@/modules/driver";
import adminModule from "@/modules/admin";

/** Coming-soon entries that should appear on the home grid but have no routes yet. */
const upcomingModules: AppModule[] = [
  { id: "flight", label: "Pesawat", icon: Plane, color: "primary", enabled: false, homePath: "#", homeEntry: { order: 50 } },
  { id: "train", label: "Kereta", icon: Train, color: "accent", enabled: false, homePath: "#", homeEntry: { order: 60 } },
  { id: "events", label: "Atraksi", icon: Ticket, color: "accent", enabled: false, homePath: "#", homeEntry: { order: 70 } },
  { id: "bills", label: "Tagihan", icon: CreditCard, color: "primary", enabled: false, homePath: "#", homeEntry: { order: 80 } },
  { id: "more", label: "Lainnya", icon: Sparkles, color: "primary", enabled: false, homePath: "#", homeEntry: { order: 90 } },
];

export const MODULES: AppModule[] = [
  hotelModule,
  shuttleModule,
  rideModule,
  driverModule,
  adminModule,
  ...upcomingModules,
];

/** Modules that opted into the home grid, sorted by order. */
export function getHomeGridModules(): AppModule[] {
  return MODULES
    .filter((m) => m.homeEntry)
    .sort((a, b) => (a.homeEntry?.order ?? 999) - (b.homeEntry?.order ?? 999));
}

/** Flatten all public routes from all modules. */
export function getAllPublicRoutes() {
  return MODULES.flatMap((m) => m.routes ?? []);
}

/** Flatten all admin routes from all modules. */
export function getAllAdminRoutes() {
  return MODULES.flatMap((m) => m.adminRoutes ?? []);
}

/** Group admin sidebar entries by their `group` label, preserving order. */
export function getAdminSidebarGroups(): Array<{
  label: string;
  items: Array<{ path: string; sidebar: NonNullable<ReturnType<typeof getAllAdminRoutes>[number]["sidebar"]> }>;
}> {
  const byGroup = new Map<string, Array<{ path: string; sidebar: NonNullable<ReturnType<typeof getAllAdminRoutes>[number]["sidebar"]> }>>();
  for (const route of getAllAdminRoutes()) {
    if (!route.sidebar) continue;
    const groupLabel = route.sidebar.group ?? "Lainnya";
    const arr = byGroup.get(groupLabel) ?? [];
    arr.push({ path: route.path, sidebar: route.sidebar });
    byGroup.set(groupLabel, arr);
  }
  // Preserve insertion order, sort items within each group
  return Array.from(byGroup.entries()).map(([label, items]) => ({
    label,
    items: items.sort((a, b) => (a.sidebar.order ?? 999) - (b.sidebar.order ?? 999)),
  }));
}

/** Run all module hydrate hooks in parallel. */
export async function hydrateAllModules(): Promise<void> {
  await Promise.all(
    MODULES.filter((m) => m.hydrate).map((m) =>
      m.hydrate!().catch((err) => console.error(`[modules] hydrate failed for ${m.id}:`, err)),
    ),
  );
}
