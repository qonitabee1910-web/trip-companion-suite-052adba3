import hiaceImg from "@/assets/shuttle/base-hiace.png";
import hiaceSemiImg from "@/assets/shuttle/base-hiace-semi.png";
import hiaceExecImg from "@/assets/shuttle/base-hiace-exec.png";
import suvImg from "@/assets/shuttle/base-suv.png";
import suvSemiImg from "@/assets/shuttle/base-suv-semi.png";
import suvExecImg from "@/assets/shuttle/base-suv-exec.png";
import minicarImg from "@/assets/shuttle/base-minicar.png";
import minicarSemiImg from "@/assets/shuttle/base-minicar-semi.png";
import minicarExecImg from "@/assets/shuttle/base-minicar-exec.png";

export interface SeatPosition {
  num: number;
  x: number; // % left
  y: number; // % top
}

export interface SeatLayoutConfig {
  image: string;
  aspect: string;
  driverSeat: { x: number; y: number };
  seats: SeatPosition[];
  /** Ukuran tombol kursi dalam % container. Default 11. */
  seatSize?: number;
}

export const DEFAULT_SEAT_SIZE = 11;

// ============================================================
// HIACE — 3 varian
// ============================================================
export const HIACE_REGULER_LAYOUT: SeatLayoutConfig = {
  image: hiaceImg,
  aspect: "1/2.2",
  seatSize: 9,
  driverSeat: { x: 68, y: 14 },
  seats: [
    { num: 1, x: 28, y: 14 },
    { num: 2, x: 24, y: 30 }, { num: 3, x: 44, y: 30 }, { num: 4, x: 60, y: 30 }, { num: 5, x: 76, y: 30 },
    { num: 6, x: 24, y: 46 }, { num: 7, x: 44, y: 46 }, { num: 8, x: 60, y: 46 }, { num: 9, x: 76, y: 46 },
    { num: 10, x: 20, y: 70 }, { num: 11, x: 40, y: 70 }, { num: 12, x: 60, y: 70 },
  ],
};

// HiAce Semi-Exec: 10 kursi (1+1 driver, 2-2, 2-2, 3 belakang)
export const HIACE_SEMI_LAYOUT: SeatLayoutConfig = {
  image: hiaceSemiImg,
  aspect: "1/2.2",
  seatSize: 10,
  driverSeat: { x: 68, y: 14 },
  seats: [
    { num: 1, x: 28, y: 14 },
    { num: 2, x: 26, y: 32 }, { num: 3, x: 70, y: 32 },
    { num: 4, x: 26, y: 46 }, { num: 5, x: 70, y: 46 },
    { num: 6, x: 26, y: 60 }, { num: 7, x: 70, y: 60 },
    { num: 8, x: 26, y: 78 }, { num: 9, x: 50, y: 78 }, { num: 10, x: 74, y: 78 },
  ],
};

// HiAce Executive: 8 captain seats (1+1 driver, 1-1, 1-1, 2 wide rear)
export const HIACE_EXEC_LAYOUT: SeatLayoutConfig = {
  image: hiaceExecImg,
  aspect: "1/2.2",
  seatSize: 11,
  driverSeat: { x: 68, y: 12 },
  seats: [
    { num: 1, x: 28, y: 12 },
    { num: 2, x: 50, y: 26 },
    { num: 3, x: 28, y: 42 }, { num: 4, x: 72, y: 42 },
    { num: 5, x: 28, y: 56 }, { num: 6, x: 72, y: 56 },
    { num: 7, x: 36, y: 82 }, { num: 8, x: 64, y: 82 },
  ],
};

// ============================================================
// SUV (Premio) — 3 varian
// ============================================================
export const SUV_REGULER_LAYOUT: SeatLayoutConfig = {
  image: suvImg,
  aspect: "1/2",
  seatSize: 11,
  driverSeat: { x: 64, y: 18 },
  seats: [
    { num: 1, x: 34, y: 18 },
    { num: 2, x: 32, y: 44 }, { num: 3, x: 66, y: 44 },
    { num: 4, x: 30, y: 66 }, { num: 5, x: 68, y: 66 },
    { num: 6, x: 49, y: 84 },
  ],
};

export const SUV_SEMI_LAYOUT: SeatLayoutConfig = {
  image: suvSemiImg,
  aspect: "1/2",
  seatSize: 12,
  driverSeat: { x: 64, y: 18 },
  seats: [
    { num: 1, x: 34, y: 18 },
    { num: 2, x: 34, y: 44 }, { num: 3, x: 66, y: 44 },
    { num: 4, x: 34, y: 64 }, { num: 5, x: 66, y: 64 },
    { num: 6, x: 50, y: 84 },
  ],
};

// SUV Executive: 5 captain seats (2 front, 2 captain, 1 rear lounge)
export const SUV_EXEC_LAYOUT: SeatLayoutConfig = {
  image: suvExecImg,
  aspect: "1/2",
  seatSize: 13,
  driverSeat: { x: 64, y: 18 },
  seats: [
    { num: 1, x: 34, y: 18 },
    { num: 2, x: 30, y: 48 }, { num: 3, x: 70, y: 48 },
    { num: 4, x: 50, y: 80 },
  ],
};

// ============================================================
// MINI CAR (Elf) — 3 varian
// ============================================================
export const MINICAR_REGULER_LAYOUT: SeatLayoutConfig = {
  image: minicarImg,
  aspect: "1/1.75",
  seatSize: 13,
  driverSeat: { x: 65, y: 22 },
  seats: [
    { num: 1, x: 33, y: 22 },
    { num: 2, x: 33, y: 62 }, { num: 3, x: 65, y: 62 },
    { num: 4, x: 49, y: 80 },
  ],
};

export const MINICAR_SEMI_LAYOUT: SeatLayoutConfig = {
  image: minicarSemiImg,
  aspect: "1/1.75",
  seatSize: 14,
  driverSeat: { x: 65, y: 22 },
  seats: [
    { num: 1, x: 35, y: 22 },
    { num: 2, x: 32, y: 50 }, { num: 3, x: 68, y: 50 },
    { num: 4, x: 50, y: 78 },
  ],
};

// Mini Car Executive: 3 captain seats (2 front + 1 solo rear)
export const MINICAR_EXEC_LAYOUT: SeatLayoutConfig = {
  image: minicarExecImg,
  aspect: "1/1.75",
  seatSize: 15,
  driverSeat: { x: 65, y: 22 },
  seats: [
    { num: 1, x: 35, y: 22 },
    { num: 2, x: 50, y: 70 },
    { num: 3, x: 50, y: 86 },
  ],
};

// ============================================================
// Layout key kombinasi vehicle × service
// ============================================================
export type ServiceTier = "reguler" | "semi-executive" | "executive";
export type VehicleId = "hiace" | "suv" | "minicar";
export type LayoutKey =
  | "HIACE_REGULER" | "HIACE_SEMI" | "HIACE_EXEC"
  | "SUV_REGULER" | "SUV_SEMI" | "SUV_EXEC"
  | "MINICAR_REGULER" | "MINICAR_SEMI" | "MINICAR_EXEC";

// Backward compat (editor lama)
export type VehicleKey = LayoutKey | "HIACE" | "ELF" | "PREMIO";

export const LAYOUT_PRESETS: Record<LayoutKey, SeatLayoutConfig> = {
  HIACE_REGULER: HIACE_REGULER_LAYOUT,
  HIACE_SEMI: HIACE_SEMI_LAYOUT,
  HIACE_EXEC: HIACE_EXEC_LAYOUT,
  SUV_REGULER: SUV_REGULER_LAYOUT,
  SUV_SEMI: SUV_SEMI_LAYOUT,
  SUV_EXEC: SUV_EXEC_LAYOUT,
  MINICAR_REGULER: MINICAR_REGULER_LAYOUT,
  MINICAR_SEMI: MINICAR_SEMI_LAYOUT,
  MINICAR_EXEC: MINICAR_EXEC_LAYOUT,
};

export const LAYOUT_LABELS: Record<LayoutKey, string> = {
  HIACE_REGULER: "HiAce Reguler",
  HIACE_SEMI: "HiAce Semi Executive",
  HIACE_EXEC: "HiAce Executive",
  SUV_REGULER: "SUV Reguler",
  SUV_SEMI: "SUV Semi Executive",
  SUV_EXEC: "SUV Executive",
  MINICAR_REGULER: "Mini Car Reguler",
  MINICAR_SEMI: "Mini Car Semi Executive",
  MINICAR_EXEC: "Mini Car Executive",
};

export const LAYOUT_KEYS = Object.keys(LAYOUT_PRESETS) as LayoutKey[];

// Backward-compat alias presets (untuk komponen lama yang masih pakai HIACE/ELF/PREMIO)
export const HIACE_LAYOUT = HIACE_REGULER_LAYOUT;
export const ELF_LAYOUT = MINICAR_REGULER_LAYOUT;
export const PREMIO_LAYOUT = SUV_REGULER_LAYOUT;

// Mapping vehicle id + service tier → LayoutKey
export function buildLayoutKey(vehicleId: VehicleId, tier: ServiceTier): LayoutKey {
  const v = vehicleId.toUpperCase() as "HIACE" | "SUV" | "MINICAR";
  const t = tier === "executive" ? "EXEC" : tier === "semi-executive" ? "SEMI" : "REGULER";
  return `${v}_${t}` as LayoutKey;
}

// Legacy resolver: from string vehicle name only (no service info)
export function vehicleKeyFromName(vehicle: string): LayoutKey {
  const v = vehicle.toLowerCase();
  if (v === "suv" || v.includes("premio")) return "SUV_REGULER";
  if (v === "minicar" || v.includes("elf") || v.includes("mini")) return "MINICAR_REGULER";
  return "HIACE_REGULER";
}

// Normalize legacy keys (HIACE/ELF/PREMIO) to new LayoutKey
function normalizeKey(key: VehicleKey): LayoutKey {
  if (key === "HIACE") return "HIACE_REGULER";
  if (key === "ELF") return "MINICAR_REGULER";
  if (key === "PREMIO") return "SUV_REGULER";
  return key as LayoutKey;
}

// ============================================================
// Cloud-backed storage (replaces former localStorage helpers)
// Reads remain sync (from in-memory cloudCache), writes fire-and-forget
// to Supabase via cloudStore. Realtime keeps cache fresh across devices.
// ============================================================
import {
  cloudCache,
  persistSeatLayout,
  clearSeatLayoutCloud,
} from "./cloudStore";

/** @deprecated kept for back-compat; no longer hits localStorage. */
export const LAYOUT_STORAGE_KEY = (key: VehicleKey) =>
  `shuttle-seat-layout:${normalizeKey(key)}`;

function getPresetByKey(key: VehicleKey): SeatLayoutConfig {
  return LAYOUT_PRESETS[normalizeKey(key)];
}

export interface SaveLayoutResult {
  ok: boolean;
  error?: { code?: string; message: string };
}

export async function saveLayoutToStorage(
  key: VehicleKey,
  config: SeatLayoutConfig,
  includeImage: boolean,
): Promise<SaveLayoutResult> {
  const layoutKey = normalizeKey(key);
  const payload: Partial<SeatLayoutConfig> = {
    aspect: config.aspect,
    driverSeat: config.driverSeat,
    seats: config.seats,
    seatSize: config.seatSize,
  };
  if (includeImage) payload.image = config.image;

  // Snapshot for rollback
  const previous = cloudCache.seatLayouts[layoutKey];
  const previousTs = cloudCache.seatLayoutTimestamps[layoutKey];

  // Optimistic local cache update
  cloudCache.seatLayouts = { ...cloudCache.seatLayouts, [layoutKey]: payload };
  cloudCache.seatLayoutTimestamps = {
    ...cloudCache.seatLayoutTimestamps,
    [layoutKey]: new Date().toISOString(),
  };

  try {
    await persistSeatLayout(layoutKey, payload);
    return { ok: true };
  } catch (err: any) {
    // Rollback cache
    const nextLayouts = { ...cloudCache.seatLayouts };
    const nextTs = { ...cloudCache.seatLayoutTimestamps };
    if (previous) nextLayouts[layoutKey] = previous; else delete nextLayouts[layoutKey];
    if (previousTs) nextTs[layoutKey] = previousTs; else delete nextTs[layoutKey];
    cloudCache.seatLayouts = nextLayouts;
    cloudCache.seatLayoutTimestamps = nextTs;
    console.error("[seatLayouts] persist failed:", err);
    return {
      ok: false,
      error: { code: err?.code, message: err?.message || "Gagal menyimpan ke cloud" },
    };
  }
}

export function loadLayoutFromStorage(key: VehicleKey): SeatLayoutConfig | null {
  const layoutKey = normalizeKey(key);
  const parsed = cloudCache.seatLayouts[layoutKey];
  if (!parsed) return null;
  const preset = getPresetByKey(key);
  return {
    image: parsed.image || preset.image,
    aspect: parsed.aspect || preset.aspect,
    driverSeat: parsed.driverSeat || preset.driverSeat,
    seats: parsed.seats || preset.seats,
    seatSize: parsed.seatSize ?? preset.seatSize,
  };
}

export function clearLayoutFromStorage(key: VehicleKey) {
  const layoutKey = normalizeKey(key);
  const next = { ...cloudCache.seatLayouts };
  delete next[layoutKey];
  cloudCache.seatLayouts = next;
  void clearSeatLayoutCloud(layoutKey).catch((err) => {
    console.error("[seatLayouts] clear failed:", err);
  });
}

export function hasStoredLayout(key: VehicleKey): boolean {
  return !!cloudCache.seatLayouts[normalizeKey(key)];
}

export interface CopyLayoutResult {
  ok: number;
  failed: { key: LayoutKey; message: string }[];
}

/**
 * Copy current source config to multiple target LayoutKeys.
 * - includeImage=false → keep each target's existing image (cloud or preset).
 * - Sequential to surface per-target errors without aborting the rest.
 */
export async function copyLayoutToTargets(
  source: SeatLayoutConfig,
  targetKeys: LayoutKey[],
  includeImage: boolean,
): Promise<CopyLayoutResult> {
  const failed: { key: LayoutKey; message: string }[] = [];
  let ok = 0;
  for (const tKey of targetKeys) {
    const targetImage = includeImage
      ? source.image
      : (cloudCache.seatLayouts[tKey]?.image || LAYOUT_PRESETS[tKey].image);
    const merged: SeatLayoutConfig = {
      image: targetImage,
      aspect: source.aspect,
      driverSeat: { ...source.driverSeat },
      seats: source.seats.map((s) => ({ ...s })),
      seatSize: source.seatSize,
    };
    const res = await saveLayoutToStorage(tKey, merged, true);
    if (res.ok) ok++;
    else failed.push({ key: tKey, message: res.error?.message || "gagal" });
  }
  return { ok, failed };
}

/** Returns the ISO timestamp of last cloud update for this layout, or null if not stored. */
export function getLayoutUpdatedAt(key: VehicleKey): string | null {
  return cloudCache.seatLayoutTimestamps[normalizeKey(key)] || null;
}

// Resolver utama untuk SeatMap user. Bisa dipanggil dengan service tier opsional.
export function getSeatLayout(
  vehicle: string,
  totalSeats: number,
  tier?: ServiceTier,
): SeatLayoutConfig {
  let key: LayoutKey;
  if (tier) {
    const v = vehicle.toLowerCase();
    const vid: VehicleId =
      v === "suv" || v.includes("premio")
        ? "suv"
        : v === "minicar" || v.includes("elf") || v.includes("mini")
          ? "minicar"
          : "hiace";
    key = buildLayoutKey(vid, tier);
  } else {
    key = vehicleKeyFromName(vehicle);
  }

  const stored = loadLayoutFromStorage(key);
  const base: SeatLayoutConfig = stored || LAYOUT_PRESETS[key];

  if (base.seats.length === totalSeats) return base;
  if (base.seats.length > totalSeats) {
    return { ...base, seats: base.seats.slice(0, totalSeats) };
  }
  const extra: SeatPosition[] = [];
  for (let i = base.seats.length; i < totalSeats; i++) {
    extra.push({ num: i + 1, x: 30 + ((i % 3) * 20), y: 90 });
  }
  return { ...base, seats: [...base.seats, ...extra] };
}
