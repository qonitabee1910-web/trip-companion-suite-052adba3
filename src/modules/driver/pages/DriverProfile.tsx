import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Camera,
  LogOut,
  Save,
  KeyRound,
  Star,
  Car,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Wallet,
  Route,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/shared/auth/useAuth";
import { uploadAvatar, uploadDriverDoc, updatePassword } from "@/shared/auth/authApi";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const verificationBadge = (status?: string | null) => {
  switch (status) {
    case "verified":
      return { label: "Terverifikasi", icon: ShieldCheck, className: "bg-success/15 text-success border-success/30" };
    case "rejected":
      return { label: "Ditolak", icon: ShieldAlert, className: "bg-destructive/15 text-destructive border-destructive/30" };
    default:
      return { label: "Pending", icon: ShieldAlert, className: "bg-warning/15 text-warning border-warning/30" };
  }
};

const DriverProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const avatarRef = useRef<HTMLInputElement>(null);
  const simRef = useRef<HTMLInputElement>(null);
  const stnkRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  const [plate, setPlate] = useState("");
  const [simExpiry, setSimExpiry] = useState("");
  const [driver, setDriver] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "sim" | "stnk" | null>(null);

  const [stats, setStats] = useState({ totalTrips: 0, today: 0, week: 0, month: 0 });

  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: drv } = await supabase.from("drivers").select("*").eq("id", user.id).maybeSingle();
      if (drv) {
        setDriver(drv);
        setVehicleType(drv.vehicle_type ?? "car");
        setPlate(drv.plate ?? "");
        setSimExpiry((drv as any).sim_expiry ?? "");
      }

      const now = new Date();
      const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
      const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
      const startMonth = new Date(now); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

      const { data: rides } = await supabase
        .from("rides")
        .select("fare, completed_at")
        .eq("driver_id", user.id)
        .eq("status", "completed");
      const list = rides ?? [];
      const sum = (from: Date) =>
        list.filter((r: any) => r.completed_at && new Date(r.completed_at) >= from).reduce((s: number, r: any) => s + (r.fare ?? 0), 0);
      setStats({
        totalTrips: list.length,
        today: sum(startToday),
        week: sum(startWeek),
        month: sum(startMonth),
      });
    })();
  }, [user]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading("avatar");
    try {
      await uploadAvatar(user.id, file);
      await refreshProfile();
      toast.success("Foto profil diperbarui");
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal upload");
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const handleDoc = async (e: React.ChangeEvent<HTMLInputElement>, type: "sim" | "stnk") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(type);
    try {
      const url = await uploadDriverDoc(user.id, file, type);
      setDriver((d: any) => ({ ...(d ?? {}), [`${type}_url`]: url }));
      toast.success(`${type.toUpperCase()} berhasil diupload`);
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal upload");
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("profiles").update({ full_name: fullName, phone, address }).eq("id", user.id),
      supabase
        .from("drivers")
        .update({ vehicle_type: vehicleType, plate, sim_expiry: simExpiry || null })
        .eq("id", user.id),
    ]);
    setSaving(false);
    if (e1 || e2) {
      toast.error((e1 ?? e2)?.message ?? "Gagal menyimpan");
      return;
    }
    await refreshProfile();
    toast.success("Profil tersimpan");
  };

  const handleChangePw = async () => {
    if (newPw !== confirmPw) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setPwBusy(true);
    try {
      await updatePassword(newPw);
      toast.success("Password diubah");
      setPwOpen(false);
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal mengubah password");
    } finally {
      setPwBusy(false);
    }
  };

  const handleLogout = async () => {
    if (driver?.is_online) await supabase.from("drivers").update({ is_online: false }).eq("id", user!.id);
    await signOut();
    navigate("/auth?role=driver", { replace: true });
  };

  const initials = (fullName || profile?.full_name || user?.email || "D")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const verBadge = verificationBadge(driver?.verification_status);
  const VerIcon = verBadge.icon;

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <div className="bg-card border-b px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold">Profil Driver</div>
      </div>

      <div className="container max-w-3xl mx-auto p-4 space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.photo_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarRef.current?.click()}
                disabled={uploading === "avatar"}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
              >
                {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-lg truncate">{fullName || "Belum diisi"}</div>
              <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-current text-yellow-500" />
                  {Number(driver?.rating ?? 5).toFixed(2)}
                </span>
                <Badge variant="outline" className={verBadge.className}>
                  <VerIcon className="h-3 w-3" /> {verBadge.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center">
            <Route className="h-4 w-4 mx-auto text-primary" />
            <div className="text-xs text-muted-foreground mt-1">Total Trip</div>
            <div className="text-xl font-bold">{stats.totalTrips}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Wallet className="h-4 w-4 mx-auto text-primary" />
            <div className="text-xs text-muted-foreground mt-1">Hari ini</div>
            <div className="text-sm font-bold text-primary">{formatRupiah(stats.today)}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Wallet className="h-4 w-4 mx-auto text-primary" />
            <div className="text-xs text-muted-foreground mt-1">7 hari</div>
            <div className="text-sm font-bold">{formatRupiah(stats.week)}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Wallet className="h-4 w-4 mx-auto text-primary" />
            <div className="text-xs text-muted-foreground mt-1">Bulan ini</div>
            <div className="text-sm font-bold">{formatRupiah(stats.month)}</div>
          </CardContent></Card>
        </div>

        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Data Pribadi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nama Lengkap</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Nomor HP</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" /> Kendaraan
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Tipe</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Mobil</SelectItem>
                  <SelectItem value="motorcycle">Motor</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nomor Plat</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="B 1234 ABC" />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Dokumen
          </CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SIM</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simRef.current?.click()}
                  disabled={uploading === "sim"}
                >
                  {uploading === "sim" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {driver?.sim_url ? "Ganti SIM" : "Upload SIM"}
                </Button>
                {driver?.sim_url && (
                  <a href={driver.sim_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Lihat file
                  </a>
                )}
                <input ref={simRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => handleDoc(e, "sim")} />
              </div>
              <div>
                <Label className="text-xs">Tanggal kadaluarsa SIM</Label>
                <Input type="date" value={simExpiry} onChange={(e) => setSimExpiry(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>STNK</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => stnkRef.current?.click()}
                  disabled={uploading === "stnk"}
                >
                  {uploading === "stnk" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {driver?.stnk_url ? "Ganti STNK" : "Upload STNK"}
                </Button>
                {driver?.stnk_url && (
                  <a href={driver.stnk_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Lihat file
                  </a>
                )}
                <input ref={stnkRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => handleDoc(e, "stnk")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Status verifikasi diproses admin setelah dokumen diupload.
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          <Save className="h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <KeyRound className="h-4 w-4" /> Ubah Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ubah Password</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Password baru</Label>
                  <Input type="password" minLength={6} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                </div>
                <div>
                  <Label>Konfirmasi</Label>
                  <Input type="password" minLength={6} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleChangePw} disabled={pwBusy}>{pwBusy ? "Menyimpan…" : "Simpan"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;
