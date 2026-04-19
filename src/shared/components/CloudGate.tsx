/**
 * CloudGate — blocks rendering until cloudStore is hydrated from Supabase.
 * Subscribes so any cache change re-renders consumers via useSyncExternalStore.
 */
import { useSyncExternalStore, type ReactNode } from "react";
import { ensureHydrated, isHydrated, subscribeStore } from "@/modules/shuttle/data/cloudStore";
import { Loader2 } from "lucide-react";

function subscribe(cb: () => void) {
  const off = subscribeStore(cb);
  return () => off();
}

export function useCloudHydrated(): boolean {
  return useSyncExternalStore(subscribe, isHydrated, isHydrated);
}

export function CloudGate({ children }: { children: ReactNode }) {
  // kick off hydration on first mount
  if (typeof window !== "undefined") {
    void ensureHydrated();
  }
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
