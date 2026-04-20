/**
 * Backward-compat shim — old `@/shared/modules` consumers keep working,
 * but the actual definitions live in module manifests + moduleRegistry.
 */
import { getHomeGridModules } from "./moduleRegistry";
import type { AppModule, ModuleColor } from "./moduleSystem";
import type { LucideIcon } from "lucide-react";

export interface ModuleEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  color: ModuleColor;
  enabled: boolean;
}

function toEntry(m: AppModule): ModuleEntry {
  return {
    id: m.id,
    label: m.label,
    icon: m.icon,
    path: m.homePath ?? "#",
    color: m.color,
    enabled: m.enabled,
  };
}

/** Home grid modules in display order — same shape as before. */
export const MODULES: ModuleEntry[] = getHomeGridModules().map(toEntry);
