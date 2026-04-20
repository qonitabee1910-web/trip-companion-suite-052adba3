import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, RotateCcw, Copy, Download, ArrowUp, ArrowDown, Save, Eraser, XCircle, Cloud, Loader2, CopyCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DraggableSeat } from "./DraggableSeat";
import { SeatEditorLivePreview } from "./SeatEditorLivePreview";
import {
  LAYOUT_PRESETS,
  LAYOUT_LABELS,
  LAYOUT_KEYS,
  saveLayoutToStorage,
  loadLayoutFromStorage,
  clearLayoutFromStorage,
  hasStoredLayout,
  buildLayoutKey,
  getLayoutUpdatedAt,
  copyLayoutToTargets,
  DEFAULT_SEAT_SIZE,
  type SeatLayoutConfig,
  type SeatPosition,
  type LayoutKey,
  type VehicleId,
  type ServiceTier,
} from "../data/seatLayouts";
import {
  getVehicleTypesAll,
  getServicesAll,
  saveVehicleTypes,
} from "../data/repository";
import { uploadSeatLayoutImage, subscribeStore } from "../data/cloudStore";
import { calcPrice, type VehicleType } from "../data/services";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  initialKey?: LayoutKey;
  initialVehicle?: VehicleId;
  initialTier?: ServiceTier;
}

const TIER_TO_SUFFIX: Record<ServiceTier, "REGULER" | "SEMI" | "EXEC"> = {
  reguler: "REGULER",
  "semi-executive": "SEMI",
  executive: "EXEC",
};

function deriveFromKey(key: LayoutKey): { vehicle: VehicleId; tier: ServiceTier } {
  const [v, t] = key.split("_");
  const vehicle = (v.toLowerCase() as VehicleId);
  const tier: ServiceTier = t === "EXEC" ? "executive" : t === "SEMI" ? "semi-executive" : "reguler";
  return { vehicle, tier };
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

export function SeatEditorPanel({ initialKey, initialVehicle, initialTier }: Props) {
  const vehicles = useMemo(() => getVehicleTypesAll(), []);
  const services = useMemo(() => getServicesAll(), []);

  const startKey: LayoutKey = initialKey
    ?? (initialVehicle && initialTier
      ? buildLayoutKey(initialVehicle, initialTier)
      : "HIACE_REGULER");

  const start = deriveFromKey(startKey);
  const [vehicleId, setVehicleId] = useState<VehicleId>(start.vehicle);
  const [tier, setTier] = useState<ServiceTier>(start.tier);
  const layoutKey: LayoutKey = buildLayoutKey(vehicleId, tier);

  const [config, setConfig] = useState<SeatLayoutConfig>(() => {
    const stored = loadLayoutFromStorage(startKey);
    const base = stored || LAYOUT_PRESETS[startKey];
    return { ...base, seats: base.seats.map((s) => ({ ...s })) };
  });
  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [snap, setSnap] = useState(false);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(() => hasStoredLayout(startKey));
  const [updatedAt, setUpdatedAt] = useState<string | null>(() => getLayoutUpdatedAt(startKey));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authStatus, setAuthStatus] = useState<"loading" | "no-auth" | "no-admin" | "admin">("loading");
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<LayoutKey[]>([]);
  const [copyIncludeImage, setCopyIncludeImage] = useState(true);
  const [copying, setCopying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check admin role on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { setAuthStatus("no-auth"); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (cancelled) return;
      setAuthStatus(data === true ? "admin" : "no-admin");
    })();
    return () => { cancelled = true; };
  }, []);

  // Subscribe to cloud store so badge timestamp refreshes when realtime fires
  useEffect(() => {
    const unsub = subscribeStore(() => {
      setUpdatedAt(getLayoutUpdatedAt(layoutKey));
      setHasSaved(hasStoredLayout(layoutKey));
    });
    return () => { unsub(); };
  }, [layoutKey]);

  // Reload whenever vehicle/tier combo changes
  useEffect(() => {
    const stored = loadLayoutFromStorage(layoutKey);
    const base = stored || LAYOUT_PRESETS[layoutKey];
    setConfig({ ...base, seats: base.seats.map((s) => ({ ...s })) });
    const isCustomImg = !!stored?.image && stored.image !== LAYOUT_PRESETS[layoutKey].image;
    setCustomImage(isCustomImg ? stored!.image : null);
    setSelectedNum(null);
    setHasSaved(hasStoredLayout(layoutKey));
    setUpdatedAt(getLayoutUpdatedAt(layoutKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const service = services.find((s) => s.tier === tier);

  // Harga dasar per (vehicle × tier) — diedit di sini, persist ke vehicles store.
  const initialTierPrice = vehicle?.tierPrices?.[tier] ?? vehicle?.basePrice ?? 0;
  const [tierPrice, setTierPrice] = useState<number>(initialTierPrice);

  // Sync price field saat ganti vehicle/tier
  useEffect(() => {
    const v = getVehicleTypesAll().find((x) => x.id === vehicleId);
    setTierPrice(v?.tierPrices?.[tier] ?? v?.basePrice ?? 0);
  }, [vehicleId, tier]);

  // Preview total harga pakai tierPrice yang sedang diedit (override sementara)
  const previewVehicle: VehicleType | undefined = vehicle
    ? { ...vehicle, tierPrices: { ...(vehicle.tierPrices ?? {}), [tier]: tierPrice } }
    : undefined;
  const finalPrice = previewVehicle && service ? calcPrice(previewVehicle, service) : 0;
  const capacity = config.seats.length;

  const resetToPreset = () => {
    const p = LAYOUT_PRESETS[layoutKey];
    setConfig({ ...p, seats: p.seats.map((s) => ({ ...s })) });
    setCustomImage(null);
    setSelectedNum(null);
  };

  const saveLayout = async () => {
    if (saving) return;
    if (authStatus !== "admin") {
      toast.error(authStatus === "no-auth"
        ? "Login admin diperlukan untuk menyimpan"
        : "Akun Anda bukan admin");
      return;
    }
    setSaving(true);
    try {
      const result = await saveLayoutToStorage(layoutKey, config, !!customImage);
      if (!result.ok) {
        const code = result.error?.code;
        if (code === "42501") {
          toast.error("Akses ditolak — login sebagai admin terlebih dahulu");
        } else {
          toast.error(`Gagal menyimpan: ${result.error?.message ?? "unknown error"}`);
        }
        return;
      }
      setHasSaved(true);
      setUpdatedAt(new Date().toISOString());

      // Persist tierPrice ke vehicles store
      if (vehicle) {
        const all = getVehicleTypesAll();
        const next = all.map((v) =>
          v.id === vehicleId
            ? { ...v, tierPrices: { ...(v.tierPrices ?? {}), [tier]: tierPrice } }
            : v,
        );
        saveVehicleTypes(next);
      }

      toast.success(`${LAYOUT_LABELS[layoutKey]} disimpan ke cloud — kapasitas ${capacity} kursi`);
    } finally {
      setSaving(false);
    }
  };

  const clearSaved = () => {
    clearLayoutFromStorage(layoutKey);
    setHasSaved(false);
    setUpdatedAt(null);
    resetToPreset();
    toast.success(`Simpanan ${LAYOUT_LABELS[layoutKey]} dihapus, kembali ke default`);
  };

  const updateSeat = (num: number, x: number, y: number) => {
    setConfig((c) => ({
      ...c,
      seats: c.seats.map((s) => (s.num === num ? { ...s, x, y } : s)),
    }));
  };

  const updateDriver = (x: number, y: number) => {
    setConfig((c) => ({ ...c, driverSeat: { x, y } }));
  };

  const addSeat = () => {
    setConfig((c) => {
      const nextNum = c.seats.length ? Math.max(...c.seats.map((s) => s.num)) + 1 : 1;
      return { ...c, seats: [...c.seats, { num: nextNum, x: 50, y: 50 }] };
    });
  };

  const removeSeat = (num: number) => {
    setConfig((c) => {
      const filtered = c.seats.filter((s) => s.num !== num);
      const renum = filtered.map((s, i) => ({ ...s, num: i + 1 }));
      return { ...c, seats: renum };
    });
    setSelectedNum(null);
  };

  const clearAllSeats = () => {
    setConfig((c) => ({ ...c, seats: [] }));
    setSelectedNum(null);
    toast.success("Semua kursi dihapus");
  };

  const reorder = (num: number, dir: -1 | 1) => {
    setConfig((c) => {
      const idx = c.seats.findIndex((s) => s.num === num);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= c.seats.length) return c;
      const next = [...c.seats];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      const renum = next.map((s, i) => ({ ...s, num: i + 1 }));
      return { ...c, seats: renum };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maks 5MB");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const url = await uploadSeatLayoutImage(layoutKey, file);
      setCustomImage(url);
      setConfig((c) => ({ ...c, image: url }));
      toast.success("Gambar diupload ke cloud — klik Simpan untuk persist layout");
    } catch (err) {
      console.error(err);
      toast.error("Gagal upload gambar (perlu login admin?)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const exportSnippet = useMemo(() => {
    const seatsStr = config.seats
      .map((s) => `    { num: ${s.num}, x: ${s.x}, y: ${s.y} },`)
      .join("\n");
    return `export const ${layoutKey}_LAYOUT: SeatLayoutConfig = {
  image: ${layoutKey.toLowerCase()}Img,
  aspect: "${config.aspect}",
  seatSize: ${config.seatSize ?? DEFAULT_SEAT_SIZE},
  driverSeat: { x: ${config.driverSeat.x}, y: ${config.driverSeat.y} },
  seats: [
${seatsStr}
  ],
};`;
  }, [config, layoutKey]);

  const copyExport = async () => {
    await navigator.clipboard.writeText(exportSnippet);
    toast.success("Snippet disalin ke clipboard");
  };

  const downloadExport = () => {
    const blob = new Blob([exportSnippet], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layoutKey.toLowerCase()}-layout.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selected = config.seats.find((s) => s.num === selectedNum);

  return (
    <div className="space-y-4">
      {authStatus !== "loading" && authStatus !== "admin" && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>
            {authStatus === "no-auth" ? "Belum login" : "Bukan admin"}
          </AlertTitle>
          <AlertDescription>
            {authStatus === "no-auth"
              ? "Login diperlukan untuk menyimpan denah ke cloud. "
              : "Akun Anda tidak punya role admin. "}
            <Link to="/admin/login" className="font-semibold underline">Buka halaman admin login</Link>.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      {/* Control panel */}
      <div className="space-y-4">
        <Card className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Kendaraan</Label>
              <Select value={vehicleId} onValueChange={(v) => setVehicleId(v as VehicleId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as ServiceTier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.tier} value={s.tier}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{LAYOUT_LABELS[layoutKey]}</Badge>
              {hasSaved && (
                <Badge variant="default" className="text-[10px] gap-1">
                  <Cloud className="h-3 w-3" />Tersimpan di cloud
                </Badge>
              )}
            </div>
            {hasSaved && updatedAt && (
              <div className="text-[11px] text-muted-foreground">
                Diperbarui: <span className="font-medium text-foreground">{formatRelative(updatedAt)}</span>
              </div>
            )}
            <div className="text-muted-foreground">
              Kapasitas kursi: <span className="font-medium text-foreground">{capacity}</span>
              <span className="text-[10px] ml-1">(otomatis dari layout)</span>
            </div>
            {service && (
              <div className="text-muted-foreground">
                Estimasi total ke user: <span className="font-medium text-foreground">Rp{finalPrice.toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>

          <div>
            <Label>Harga Dasar — {service?.label} (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={tierPrice}
              onChange={(e) => setTierPrice(Math.max(0, Number(e.target.value) || 0))}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Harga dasar untuk kombinasi {vehicle?.label ?? "kendaraan"} × {service?.label ?? "service"}. Disimpan saat klik Simpan.
            </p>
          </div>

          <div>
            <Label>Aspect Ratio</Label>
            <Input
              value={config.aspect}
              onChange={(e) => setConfig((c) => ({ ...c, aspect: e.target.value }))}
              placeholder="1/2.2"
            />
          </div>
          <div>
            <Label>Upload denah (opsional)</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            {uploading && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />Mengupload ke cloud…
              </p>
            )}
            {!uploading && customImage && (
              <p className="mt-1 text-xs text-muted-foreground">Custom image aktif (cloud URL)</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="snap" className="cursor-pointer">Snap to grid (1%)</Label>
            <Switch id="snap" checked={snap} onCheckedChange={setSnap} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Ukuran kursi</Label>
              <span className="text-xs font-mono text-muted-foreground">{config.seatSize ?? DEFAULT_SEAT_SIZE}%</span>
            </div>
            <Slider
              min={5}
              max={18}
              step={1}
              value={[config.seatSize ?? DEFAULT_SEAT_SIZE]}
              onValueChange={(v) => setConfig((c) => ({ ...c, seatSize: v[0] }))}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={addSeat} size="sm" variant="outline"><Plus className="h-4 w-4" />Kursi</Button>
            <Button onClick={resetToPreset} size="sm" variant="outline"><RotateCcw className="h-4 w-4" />Reset</Button>
            <Button onClick={saveLayout} size="sm" className="col-span-2" disabled={saving || authStatus !== "admin"}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Menyimpan…" : "Simpan ke tampilan user"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="col-span-2 text-destructive hover:text-destructive"
                  disabled={config.seats.length === 0}
                >
                  <XCircle className="h-4 w-4" />Hapus semua kursi
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus semua kursi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Semua {config.seats.length} kursi pada layout {LAYOUT_LABELS[layoutKey]} akan dihapus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllSeats}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Ya, hapus semua
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {hasSaved && (
              <Button onClick={clearSaved} size="sm" variant="ghost" className="col-span-2 text-destructive hover:text-destructive">
                <Eraser className="h-4 w-4" />Hapus simpanan
              </Button>
            )}
          </div>
        </Card>

        {selected && (
          <Card className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Kursi #{selected.num}</h3>
              <Button onClick={() => removeSeat(selected.num)} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X (%)</Label>
                <Input
                  type="number"
                  value={selected.x}
                  onChange={(e) => updateSeat(selected.num, Number(e.target.value), selected.y)}
                />
              </div>
              <div>
                <Label className="text-xs">Y (%)</Label>
                <Input
                  type="number"
                  value={selected.y}
                  onChange={(e) => updateSeat(selected.num, selected.x, Number(e.target.value))}
                />
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="mb-2 font-bold">Daftar Kursi ({config.seats.length})</h3>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {config.seats.map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-2 rounded-md border p-2 text-xs ${
                  selectedNum === s.num ? "border-primary bg-primary/5" : ""
                }`}
              >
                <button className="flex-1 text-left" onClick={() => setSelectedNum(s.num)}>
                  <span className="font-bold">#{s.num}</span>{" "}
                  <span className="text-muted-foreground">({s.x}, {s.y})</span>
                </button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => reorder(s.num, -1)}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => reorder(s.num, 1)}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-2 p-4">
          <h3 className="font-bold">Export</h3>
          <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-[10px]">
            <code>{exportSnippet}</code>
          </pre>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copyExport} size="sm"><Copy className="h-4 w-4" />Copy</Button>
            <Button onClick={downloadExport} size="sm" variant="outline"><Download className="h-4 w-4" />Download</Button>
          </div>
        </Card>
      </div>

      {/* Canvas + Live preview */}
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <Card className="p-4">
        <div
          ref={containerRef}
          className="relative mx-auto w-full max-w-[400px] rounded-xl bg-muted/30"
          style={{ aspectRatio: config.aspect }}
          onClick={() => setSelectedNum(null)}
        >
          <img
            src={config.image}
            alt="Denah"
            className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none"
            draggable={false}
          />
          <DraggableSeat
            x={config.driverSeat.x}
            y={config.driverSeat.y}
            label="D"
            isDriver
            containerRef={containerRef}
            onMove={updateDriver}
            snap={snap ? 1 : 0}
            size={config.seatSize ?? DEFAULT_SEAT_SIZE}
          />
          {config.seats.map((s: SeatPosition) => (
            <DraggableSeat
              key={s.num}
              x={s.x}
              y={s.y}
              label={s.num}
              selected={selectedNum === s.num}
              containerRef={containerRef}
              onMove={(x, y) => updateSeat(s.num, x, y)}
              onSelect={() => setSelectedNum(s.num)}
              onDelete={() => removeSeat(s.num)}
              snap={snap ? 1 : 0}
              size={config.seatSize ?? DEFAULT_SEAT_SIZE}
            />
          ))}
        </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Drag untuk memindahkan • Klik untuk seleksi • Tombol × pada kursi terpilih untuk hapus
          </p>
        </Card>

        <Card className="p-4 xl:sticky xl:top-20 xl:self-start">
          <SeatEditorLivePreview config={config} />
        </Card>
      </div>
    </div>
    </div>
  );
}
