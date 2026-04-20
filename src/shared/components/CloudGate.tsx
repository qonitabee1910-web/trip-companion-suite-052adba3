/**
 * CloudGate — blocks rendering until all module hydrate hooks complete.
 * Subscribes to the shared store so cache changes trigger re-renders.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { hydrateAllModules } from "@/shared/moduleRegistry";
import { subscribeStore, isHydrated } from "@/modules/shuttle/data/cloudStore";

export function useCloudHydrated(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(isHydrated());
  useEffect(() => {
    let cancelled = false;
    if (!hydrated) {
      hydrateAllModules().then(() => {
        if (!cancelled) setHydrated(true);
      });
    }
    const off = subscribeStore(() => {
      if (!cancelled && isHydrated()) setHydrated(true);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [hydrated]);
  return hydrated;
}

export function CloudGate({ children }: { children: ReactNode }) {
  const hydrated = useCloudHydrated();
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Memuat data…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
