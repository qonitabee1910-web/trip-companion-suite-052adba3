import { useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Plus, Edit, Trash2, X, RotateCcw, Save, MapPin, Clock, Sparkles,
  ArrowUp, ArrowDown, Route, Calculator, Crosshair, Maximize2,
} from "lucide-react";
import { PickupCoordinateMap } from "../components/PickupCoordinateMap";
import {
  getRayons,
  saveRayons,
  getDepartTimes,
  saveDepartTimes,
  resetSection,
} from "@/modules/shuttle/data/repository";
import {
  type Rayon,
  type RayonId,
  type PickupPoint,
  SEED_RAYONS_PYUGO,
  DEFAULT_FARE_PER_KM,
  getTotalDistanceM,
  getDestination,
} from "@/modules/shuttle/data/rayons";
import { useToast } from "@/hooks/use-toast";

const emptyRayon = (id: RayonId, destShort: string): Rayon => ({
  id,
  name: "",
  area: "",
  pickupPoints: [{ code: "DEST", name: destShort, time: "", distanceToNext: 0 }],
  color: "primary",
  estimateMin: 60,
  surcharge: 0,
  farePerKm: DEFAULT_FARE_PER_KM,
  perPickupFare: false,
});

const formatRupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

const AdminRayons = () => {
  const { toast } = useToast();
  const dest = getDestination();
  const [rayons, setRayons] = useState<Rayon[]>(getRayons());
  const [times, setTimes] = useState<string[]>(getDepartTimes());
  const [editing, setEditing] = useState<{ index: number; data: Rayon } | null>(null);
  const [newTime, setNewTime] = useState("");
  const [activeCaptureCode, setActiveCaptureCode] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);

  const persistRayons = (next: Rayon[]) => {
    setRayons(next);
    saveRayons(next);
    toast({ title: "Rayon disimpan", description: `${next.length} rayon aktif.` });
  };

  const persistTimes = (next: string[]) => {
    const sorted = [...new Set(next)].sort();
    setTimes(sorted);
    saveDepartTimes(sorted);
  };

  const openNew = () => {
    setEditing({
      index: -1,
      data: emptyRayon((String.fromCharCode(65 + rayons.length) as RayonId), dest.short),
    });
  };

  const seedFromPYUGO = () => {
    persistRayons(SEED_RAYONS_PYUGO);
    toast({ title: "Seed berhasil", description: `${SEED_RAYONS_PYUGO.length} rayon PYU-GO dimuat.` });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    const data = editing.data;
    if (!data.id || !data.name || !data.area) {
      toast({ title: "Lengkapi data", description: "ID, Nama, dan Area wajib.", variant: "destructive" });
      return;
    }
    // Ensure last point is destination
    const pts = [...data.pickupPoints];
    if (pts.length === 0 || pts[pts.length - 1].code !== "DEST") {
      pts.push({ code: "DEST", name: dest.short, time: "", distanceToNext: 0 });
    }
    pts[pts.length - 1] = { ...pts[pts.length - 1], distanceToNext: 0 };

    const next = [...rayons];
    const finalData = { ...data, pickupPoints: pts };
    if (editing.index < 0) next.push(finalData);
    else next[editing.index] = finalData;
    persistRayons(next);
    setEditing(null);
  };

  const handleDelete = (idx: number) => {
    const next = rayons.filter((_, i) => i !== idx);
    persistRayons(next);
  };

  const updatePickup = (i: number, patch: Partial<PickupPoint>) => {
    if (!editing) return;
    const pts = editing.data.pickupPoints.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    setEditing({ ...editing, data: { ...editing.data, pickupPoints: pts } });
  };

  const movePickup = (i: number, dir: -1 | 1) => {
    if (!editing) return;
    const pts = [...editing.data.pickupPoints];
    const j = i + dir;
    if (j < 0 || j >= pts.length) return;
    [pts[i], pts[j]] = [pts[j], pts[i]];
    setEditing({ ...editing, data: { ...editing.data, pickupPoints: pts } });
  };

  const removePickup = (i: number) => {
    if (!editing) return;
    const pts = editing.data.pickupPoints.filter((_, idx) => idx !== i);
    setEditing({ ...editing, data: { ...editing.data, pickupPoints: pts } });
  };

  const addPickupRow = () => {
    if (!editing) return;
    const pts = [...editing.data.pickupPoints];
    // Insert before destination if last is DEST
    const insertAt = pts.length > 0 && pts[pts.length - 1].code === "DEST" ? pts.length - 1 : pts.length;
    const realCount = pts.filter((p) => p.code !== "DEST").length;
    pts.splice(insertAt, 0, {
      code: `J${realCount + 1}`,
      name: "",
      time: "",
      distanceToNext: 0,
    });
    setEditing({ ...editing, data: { ...editing.data, pickupPoints: pts } });
  };

  const findNextEmptyCode = (pts: PickupPoint[], afterCode: string): string | null => {
    const startIdx = pts.findIndex((p) => p.code === afterCode);
    for (let k = startIdx + 1; k < pts.length; k++) {
      if (typeof pts[k].lat !== "number" || typeof pts[k].lng !== "number") return pts[k].code;
    }
    for (let k = 0; k < pts.length; k++) {
      if (typeof pts[k].lat !== "number" || typeof pts[k].lng !== "number") return pts[k].code;
    }
    return null;
  };

  const handleCapture = (code: string, lat: number, lng: number) => {
    if (!editing) return;
    const pts = editing.data.pickupPoints.map((p) =>
      p.code === code ? { ...p, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) } : p,
    );
    setEditing({ ...editing, data: { ...editing.data, pickupPoints: pts } });
    setActiveCaptureCode(findNextEmptyCode(pts, code));
  };

  const handleDragMarker = (code: string, lat: number, lng: number) => {
    if (!editing) return;
    const pts = editing.data.pickupPoints.map((p) =>
      p.code === code ? { ...p, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) } : p,
    );
    setEditing({ ...editing, data: { ...editing.data, pickupPoints: pts } });
  };

  const clearCoord = (code: string) => {
    if (!editing) return;
    const pts = editing.data.pickupPoints.map((p) =>
      p.code === code ? { ...p, lat: undefined, lng: undefined } : p,
    );
    setEditing({ ...editing, data: { ...editing.data, pickupPoints: pts } });
  };

  const addTime = () => {
    if (!/^\d{2}:\d{2}$/.test(newTime)) {
      toast({ title: "Format jam salah", description: "Gunakan HH:MM (cth 06:00).", variant: "destructive" });
      return;
    }
    persistTimes([...times, newTime]);
    setNewTime("");
  };

  const removeTime = (t: string) => persistTimes(times.filter((x) => x !== t));

  const handleReset = () => {
    resetSection("rayons");
    resetSection("times");
    setRayons(getRayons());
    setTimes(getDepartTimes());
    toast({ title: "Direset", description: "Data rayon & jam dikembalikan ke default." });
  };

  // Summary
  const totalPickups = rayons.reduce((s, r) => s + r.pickupPoints.filter((p) => p.code !== "DEST").length, 0);
  const totalKm = rayons.reduce((s, r) => s + getTotalDistanceM(r) / 1000, 0);
  const avgFare = rayons.length === 0 ? 0 : rayons.reduce((s, r) => {
    const km = getTotalDistanceM(r) / 1000;
    return s + km * (r.farePerKm ?? DEFAULT_FARE_PER_KM);
  }, 0) / rayons.length;

  // For editing dialog: live preview
  const editTotalDist = editing ? getTotalDistanceM(editing.data) : 0;
  const editTotalKm = editTotalDist / 1000;
  const editFarePerKm = editing?.data.farePerKm ?? DEFAULT_FARE_PER_KM;
  const editFareRaw = editTotalKm * editFarePerKm;
  const editFareRounded = Math.round((editFareRaw + (editing?.data.surcharge ?? 0)) / 1000) * 1000;

  return (
    <AdminLayout title="Rayon & Jam">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total Rayon</p>
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{rayons.length}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total Titik Jemput</p>
              <Route className="h-4 w-4 text-accent" />
            </div>
            <p className="text-2xl font-bold">{totalPickups}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total Jarak</p>
              <Route className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold">{totalKm.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Rata-rata Fare/Rayon</p>
              <Calculator className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-bold">{formatRupiah(avgFare)}</p>
          </Card>
        </div>

        <Card className="p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Daftar Rayon
              </h2>
              <p className="text-xs text-muted-foreground">Kelola area, titik jemput, jarak & tarif per km.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Sparkles className="h-4 w-4" /> Seed dari PYU-GO
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Muat data PYU-GO?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Akan menimpa <strong>seluruh</strong> rayon dengan 4 rayon (A-D) lengkap dengan titik jemput, jam, dan jarak dari data PYU-GO. Lanjutkan?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={seedFromPYUGO}>Ya, Muat</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Rayon & Jam?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua perubahan akan dikembalikan ke default.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama / Area</TableHead>
                  <TableHead className="text-center">Titik</TableHead>
                  <TableHead className="text-right">Jarak (km)</TableHead>
                  <TableHead className="text-right">Tarif/km</TableHead>
                  <TableHead className="text-right">Estimasi Fare</TableHead>
                  <TableHead className="text-right">Surcharge</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rayons.map((r, idx) => {
                  const km = getTotalDistanceM(r) / 1000;
                  const fpk = r.farePerKm ?? DEFAULT_FARE_PER_KM;
                  const est = Math.round((km * fpk + (r.surcharge ?? 0)) / 1000) * 1000;
                  const realPickups = r.pickupPoints.filter((p) => p.code !== "DEST").length;
                  return (
                    <TableRow key={r.id + idx}>
                      <TableCell className="font-mono font-bold">{r.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.area}</div>
                      </TableCell>
                      <TableCell className="text-center">{realPickups}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {km.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatRupiah(fpk)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-accent tabular-nums">
                        {formatRupiah(est)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.surcharge ? `+${formatRupiah(r.surcharge)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditing({ index: idx, data: r })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rayons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Belum ada rayon. Klik <em>Seed dari PYU-GO</em> untuk memuat data awal.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" /> Jam Berangkat Global
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {times.map((t) => (
              <Badge key={t} variant="secondary" className="text-sm py-1.5 pl-3 pr-1 gap-1">
                {t}
                <button onClick={() => removeTime(t)} className="hover:bg-destructive/20 rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {times.length === 0 && <p className="text-xs text-muted-foreground">Belum ada jam.</p>}
          </div>
          <div className="flex gap-2 max-w-xs">
            <Input
              placeholder="HH:MM"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              maxLength={5}
            />
            <Button onClick={addTime} size="sm">
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && editing.index >= 0 ? `Edit ${editing.data.name || "Rayon"}` : "Tambah Rayon"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-6">
              {/* Section 1: Info Dasar */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold">1</span>
                  Info Dasar
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>ID (1 huruf)</Label>
                    <Input
                      value={editing.data.id}
                      maxLength={1}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, id: e.target.value.toUpperCase() as RayonId },
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Nama</Label>
                    <Input
                      value={editing.data.name}
                      onChange={(e) =>
                        setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Estimasi (menit)</Label>
                    <Input
                      type="number"
                      value={editing.data.estimateMin}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, estimateMin: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <Label>Area</Label>
                    <Input
                      value={editing.data.area}
                      onChange={(e) =>
                        setEditing({ ...editing, data: { ...editing.data, area: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Surcharge (Rp)</Label>
                    <Input
                      type="number"
                      value={editing.data.surcharge ?? 0}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, surcharge: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Section 2: Tarif per KM */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold">2</span>
                  Tarif per KM
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Tarif per km (Rp)</Label>
                    <Input
                      type="number"
                      value={editing.data.farePerKm ?? DEFAULT_FARE_PER_KM}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, farePerKm: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={editing.data.perPickupFare ?? false}
                        onCheckedChange={(v) =>
                          setEditing({ ...editing, data: { ...editing.data, perPickupFare: v } })
                        }
                      />
                      <span>Hitung fare per titik jemput</span>
                    </label>
                  </div>
                </div>
                <Card className="mt-3 p-3 bg-muted/40 border-dashed">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calculator className="h-3 w-3" /> Preview perhitungan (multiplier service belum diterapkan):
                  </p>
                  <p className="text-sm font-mono">
                    {editTotalKm.toLocaleString("id-ID", { maximumFractionDigits: 2 })} km × {formatRupiah(editFarePerKm)}
                    {editing.data.surcharge ? ` + ${formatRupiah(editing.data.surcharge)}` : ""}
                    {" = "}
                    <span className="text-muted-foreground">{formatRupiah(editFareRaw + (editing.data.surcharge ?? 0))}</span>
                    {" → "}
                    <span className="font-bold text-accent">{formatRupiah(editFareRounded)}</span>
                  </p>
                </Card>
              </section>

              <Separator />

              {/* Section 3: Pickup Points */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold">3</span>
                    Titik Jemput & Jarak
                  </h3>
                  <Button size="sm" variant="outline" onClick={addPickupRow} type="button">
                    <Plus className="h-4 w-4" /> Tambah Titik
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="w-[80px]">Kode</TableHead>
                        <TableHead>Nama Titik</TableHead>
                        <TableHead className="w-[100px]">Jam</TableHead>
                        <TableHead className="w-[140px] text-right">Jarak ke berikutnya (m)</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editing.data.pickupPoints.map((p, i) => {
                        const isDest = p.code === "DEST";
                        return (
                          <TableRow key={i} className={isDest ? "bg-accent/5" : ""}>
                            <TableCell className="p-1">
                              <div className="flex flex-col">
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => movePickup(i, -1)} disabled={i === 0}>
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => movePickup(i, 1)} disabled={i === editing.data.pickupPoints.length - 1}>
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                value={p.code}
                                disabled={isDest}
                                onChange={(e) => updatePickup(i, { code: e.target.value })}
                                className="h-8 font-mono text-xs"
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                value={p.name}
                                onChange={(e) => updatePickup(i, { name: e.target.value })}
                                className="h-8"
                                placeholder={isDest ? "Tujuan akhir" : "Nama titik"}
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                value={p.time}
                                onChange={(e) => updatePickup(i, { time: e.target.value })}
                                className="h-8"
                                placeholder="HH:MM"
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                type="number"
                                value={p.distanceToNext}
                                disabled={isDest}
                                onChange={(e) => updatePickup(i, { distanceToNext: Number(e.target.value) || 0 })}
                                className="h-8 text-right tabular-nums"
                              />
                            </TableCell>
                            <TableCell className="p-1 text-right">
                              {!isDest && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removePickup(i)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-2 px-1 text-xs">
                  <span className="text-muted-foreground">
                    {editing.data.pickupPoints.filter((p) => p.code !== "DEST").length} titik jemput + 1 tujuan
                  </span>
                  <span className="font-semibold">
                    Total jarak: {editTotalKm.toLocaleString("id-ID", { maximumFractionDigits: 2 })} km
                  </span>
                </div>
              </section>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4" /> Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRayons;
