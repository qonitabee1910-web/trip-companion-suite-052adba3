import { useEffect, useState } from "react";
import { subscribeStore } from "../data/cloudStore";

/**
 * Subscribe ke cloudStore agar komponen yang baca data master (services, vehicles,
 * rayons, dll) ikut re-render saat admin/realtime mengubah data — tanpa perlu
 * refresh halaman.
 *
 * Pemakaian: panggil di top-level halaman/komponen yang menampilkan harga atau
 * data master shuttle. Tidak butuh value, cukup trigger re-render.
 */
export function useCloudSnapshot(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeStore(() => setTick((t) => t + 1));
    return () => {
      unsub();
    };
  }, []);
  return tick;
}
