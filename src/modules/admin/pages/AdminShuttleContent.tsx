import { useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Save, RotateCcw, Image as ImageIcon, Plane, MapPin } from "lucide-react";
import {
  getDestinationStored,
  saveDestination,
  getContentStored,
  saveContent,
  resetSection,
} from "@/modules/shuttle/data/repository";
import type { Destination, ShuttleContent } from "@/modules/shuttle/data/rayons";
import { useToast } from "@/hooks/use-toast";

const AdminShuttleContent = () => {
  const { toast } = useToast();
  const [dest, setDest] = useState<Destination>(getDestinationStored());
  const [content, setContent] = useState<ShuttleContent>(getContentStored());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const [destRes, contentRes] = await Promise.all([
      saveDestination(dest),
      saveContent(content),
    ]);
    setSaving(false);
    if (!destRes.ok || !contentRes.ok) {
      const err = !destRes.ok ? destRes.error : contentRes.error;
      if (err?.code === "42501") {
        toast({
          title: "Akses ditolak",
          description: "Login admin diperlukan untuk mengubah konten.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Gagal menyimpan konten",
          description: err?.message ?? "Terjadi kesalahan.",
          variant: "destructive",
        });
      }
      // Re-sync from cache (rolled back values)
      setDest(getDestinationStored());
      setContent(getContentStored());
      return;
    }
    toast({ title: "Konten disimpan", description: "Tampilan user shuttle diperbarui di cloud." });
  };

  const handleReset = () => {
    resetSection("destination");
    resetSection("content");
    setDest(getDestinationStored());
    setContent(getContentStored());
    toast({ title: "Direset ke default" });
  };

  return (
    <AdminLayout title="Beranda Shuttle">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px] max-w-6xl mx-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Konten User Shuttle
              </h2>
              <p className="text-xs text-muted-foreground">Atur tujuan, hero, dan kapasitas pemesanan.</p>
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
                    <AlertDialogTitle>Reset konten?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tujuan & hero akan dikembalikan ke nilai default.
                    </AlertDialogDescription>
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

          <Card className="p-4 md:p-5 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Plane className="h-4 w-4 text-accent" /> Tujuan Shuttle
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Kode</Label>
                <Input value={dest.code} maxLength={6} onChange={(e) => setDest({ ...dest, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="md:col-span-2">
                <Label>Nama Pendek</Label>
                <Input value={dest.short} onChange={(e) => setDest({ ...dest, short: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Label>Nama Lengkap</Label>
                <Input value={dest.name} onChange={(e) => setDest({ ...dest, name: e.target.value })} />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-5 space-y-3">
            <h3 className="font-semibold text-sm">Hero & Footer</h3>
            <div>
              <Label>Judul Hero</Label>
              <Input value={content.heroTitle} onChange={(e) => setContent({ ...content, heroTitle: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={content.heroSubtitle} onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })} />
            </div>
            <div>
              <Label>Footer / Cara Pesan</Label>
              <Textarea
                rows={3}
                value={content.footerNote}
                onChange={(e) => setContent({ ...content, footerNote: e.target.value })}
              />
            </div>
            <div className="max-w-xs">
              <Label>Pax Maksimum per Booking</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={content.paxMax}
                onChange={(e) => setContent({ ...content, paxMax: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-hero text-primary-foreground p-4">
              <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
                <MapPin className="h-3.5 w-3.5" /> Tujuan tetap
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <Plane className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-extrabold leading-tight">{dest.short}</p>
                  <p className="text-[11px] text-white/85">{dest.name}</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Badge variant="secondary" className="mb-1 text-[10px]">Hero</Badge>
                <p className="font-bold text-sm">{content.heroTitle}</p>
                <p className="text-xs text-muted-foreground">{content.heroSubtitle}</p>
              </div>
              <div className="rounded-lg bg-muted/40 border-dashed border p-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">{content.footerNote}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Pax max: {content.paxMax}</p>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminShuttleContent;
