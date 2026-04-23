import { useState, useEffect } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Calculator, Shield, History, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getFareSettingsStored,
  saveFareSettings,
  getActivityLogs,
} from "@/modules/shuttle/data/repository";
import type { FareSettings, ShuttleActivityLog } from "@/modules/shuttle/data/services";
import { format } from "date-fns";

const AdminFareSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FareSettings>({
    calculationMethod: "distance_based",
    minFare: 50000,
    maxDistanceKm: 500,
    enableLogging: true,
  });
  const [logs, setLogs] = useState<ShuttleActivityLog[]>([]);

  useEffect(() => {
    const s = getFareSettingsStored();
    setSettings(s);
    loadLogs();
    setLoading(false);
  }, []);

  const loadLogs = async () => {
    const activityLogs = await getActivityLogs(10);
    setLogs(activityLogs);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const res = await saveFareSettings(settings);
    setSaving(false);

    if (!res.ok) {
      toast({
        title: "Gagal menyimpan",
        description: res.error?.message ?? "Terjadi kesalahan.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pengaturan tarif disimpan",
      description: "Perubahan akan diterapkan pada perhitungan harga baru.",
    });
    loadLogs();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pengaturan Tarif</h1>
            <p className="text-muted-foreground">
              Konfigurasi metode perhitungan harga shuttle dan batasan sistem.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? "Menyimpan..." : <><Save className="h-4 w-4" /> Simpan Perubahan</>}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Calculator className="h-5 w-5" /> Metode Perhitungan
              </CardTitle>
              <CardDescription>
                Pilih bagaimana harga total dihitung untuk pelanggan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.calculationMethod}
                onValueChange={(v: any) => setSettings({ ...settings, calculationMethod: v })}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="distance_based" id="m1" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="m1" className="font-semibold">Berbasis Jarak (Rekomendasi)</Label>
                    <p className="text-sm text-muted-foreground">
                      Rumus: (Jarak × Harga Service) + Biaya Dasar Kendaraan + Surcharge Rayon.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="tier_based" id="m2" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="m2" className="font-semibold">Berbasis Tier (Flat)</Label>
                    <p className="text-sm text-muted-foreground">
                      Hanya menggunakan harga dasar yang ditentukan pada masing-masing tier layanan.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="fixed" id="m3" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="m3" className="font-semibold">Harga Tetap (Global)</Label>
                    <p className="text-sm text-muted-foreground">
                      Semua rute dan kendaraan menggunakan satu harga tetap (contoh: Rp 100.000).
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" /> Batasan & Validasi
              </CardTitle>
              <CardDescription>
                Kontrol keamanan untuk mencegah kesalahan input atau harga tidak wajar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minFare">Tarif Minimum (Rp)</Label>
                <Input
                  id="minFare"
                  type="number"
                  value={settings.minFare}
                  onChange={(e) => setSettings({ ...settings, minFare: Number(e.target.value) })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Harga total tidak akan pernah lebih rendah dari nilai ini.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDist">Jarak Maksimum (KM)</Label>
                <Input
                  id="maxDist"
                  type="number"
                  value={settings.maxDistanceKm}
                  onChange={(e) => setSettings({ ...settings, maxDistanceKm: Number(e.target.value) })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Batas validasi untuk rute terjauh yang didukung sistem.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Audit Logging</Label>
                  <p className="text-xs text-muted-foreground">Simpan histori perubahan pengaturan.</p>
                </div>
                <Switch
                  checked={settings.enableLogging}
                  onCheckedChange={(v) => setSettings({ ...settings, enableLogging: v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Histori Aktivitas
            </CardTitle>
            <CardDescription>
              Log perubahan terakhir pada konfigurasi tarif.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground italic">
                  Belum ada log aktivitas.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="mt-1 bg-muted p-2 rounded-full">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {log.action === "update_fare_settings" ? "Update Pengaturan Tarif" : log.action}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded mt-1 overflow-x-auto">
                        <pre>{JSON.stringify(log.details.after, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminFareSettings;
