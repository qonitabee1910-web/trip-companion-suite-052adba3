import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Save, RotateCcw, Bus, Armchair, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getVehicleTypesAll, saveVehicleTypes, resetSection } from "@/modules/shuttle/data/repository";
import type { VehicleType } from "@/modules/shuttle/data/services";
import { useToast } from "@/hooks/use-toast";

const AdminVehicles = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleType[]>(getVehicleTypesAll());

  const update = (idx: number, patch: Partial<VehicleType>) => {
    setVehicles((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const res = await saveVehicleTypes(vehicles);
    setSaving(false);
    if (!res.ok) {
      if (res.error?.code === "42501") {
        toast({
          title: "Akses ditolak",
          description: "Login admin diperlukan untuk menyimpan kendaraan.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Gagal menyimpan",
          description: res.error?.message ?? "Terjadi kesalahan.",
          variant: "destructive",
        });
      }
      setVehicles(getVehicleTypesAll());
      return;
    }
    toast({ title: "Kendaraan disimpan", description: "Perubahan tersimpan ke cloud." });
  };

  const handleReset = () => {
    resetSection("vehicles");
    setVehicles(getVehicleTypesAll());
    toast({ title: "Direset" });
  };

  return (
    <AdminLayout title="Kendaraan">
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Bus className="h-4 w-4 text-primary" /> Tipe Kendaraan
            </h2>
            <p className="text-xs text-muted-foreground">Atur identitas & status. Kapasitas kursi & harga dasar diatur di Seat Editor.</p>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Kendaraan?</AlertDialogTitle>
                  <AlertDialogDescription>Kembalikan ke default.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4" /> Simpan
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs flex items-start gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Kapasitas kursi dihitung otomatis dari jumlah kursi pada layout. Harga dasar diatur per (kendaraan × service) di Seat Editor.
          </span>
        </div>

        {vehicles.map((v, idx) => (
          <Card key={v.id} className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-muted">{v.id}</span>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={v.active !== false}
                    onCheckedChange={(checked) => update(idx, { active: checked })}
                  />
                  <span className="text-muted-foreground">{v.active !== false ? "Aktif" : "Nonaktif"}</span>
                </label>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
                  <Armchair className="h-3.5 w-3.5" /> Edit denah & harga:
                </span>
                {([
                  { tier: "reguler", label: "Reguler" },
                  { tier: "semi-executive", label: "Semi" },
                  { tier: "executive", label: "Exec" },
                ] as const).map((t) => (
                  <Button key={t.tier} asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <Link to={`/admin/shuttle/seat-editor?vehicle=${v.id}&tier=${t.tier}`}>
                      {t.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Label</Label>
                <Input value={v.label} onChange={(e) => update(idx, { label: e.target.value })} />
              </div>
              <div>
                <Label>Nama Kendaraan</Label>
                <Input value={v.vehicleName} onChange={(e) => update(idx, { vehicleName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                rows={2}
                value={v.description}
                onChange={(e) => update(idx, { description: e.target.value })}
              />
            </div>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminVehicles;
