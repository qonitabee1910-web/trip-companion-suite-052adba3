/**
 * Module manifest system.
 *
 * Each feature module under `src/modules/<name>/index.ts` exports a default
 * `AppModule` that declares its public routes, admin routes, optional home grid
 * entry, and optional hydrate hook. The aggregated registry lives in
 * `src/shared/moduleRegistry.ts`.
 *
 * Adding a new module = create the folder + manifest, then register it in
 * `moduleRegistry.ts`. App.tsx, Home grid, and Admin sidebar pick it up
 * automatically.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type ModuleColor = "hotel" | "shuttle" | "ride" | "primary" | "accent";

export interface ModuleRoute {
  path: string;
  element: ReactNode;
}

export interface AdminSidebarEntry {
  label: string;
  icon: LucideIcon;
  /** Group label shown in sidebar (e.g. "Operasional", "Setup Layanan") */
  group?: string;
  /** Lower = earlier in the group */
  order?: number;
  /** Treat path as exact match (used for the dashboard root) */
  end?: boolean;
}

export interface AdminModuleRoute extends ModuleRoute {
  /** When present, this admin route appears in the sidebar */
  sidebar?: AdminSidebarEntry;
}

export interface HomeGridEntry {
  /** Order on home grid; lower comes first */
  order?: number;
}

export interface AppModule {
  /** Stable id (slug) — also used as cache key */
  id: string;
  /** Display label on home grid + admin sidebar header (if relevant) */
  label: string;
  /** Icon used on home grid */
  icon: LucideIcon;
  /** Brand color token */
  color: ModuleColor;
  /** When false, module is hidden from home grid (routes still mount) */
  enabled: boolean;
  /** Public-facing route to land on from home grid */
  homePath?: string;
  /** Set when this module appears in the home grid */
  homeEntry?: HomeGridEntry;
  /** All public routes owned by this module */
  routes?: ModuleRoute[];
  /** All admin routes owned by this module */
  adminRoutes?: AdminModuleRoute[];
  /** Called once at boot by CloudGate (in parallel with other modules) */
  hydrate?: () => Promise<void>;
}
