/**
 * Helper for lazy-loading a route element.
 *
 * Usage in module manifests:
 *   element: lazyEl(() => import("./pages/HotelHome"))
 *
 * The Suspense boundary lives in App.tsx so a single fallback covers all routes.
 */
import { createElement, lazy, type ComponentType, type ReactNode } from "react";

type Importer = () => Promise<{ default: ComponentType<unknown> }>;

export function lazyEl(importer: Importer): ReactNode {
  const Comp = lazy(importer);
  return createElement(Comp);
}
