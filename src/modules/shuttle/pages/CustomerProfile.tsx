import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Camera,
  LogOut,
  Save,
  KeyRound,
  Ticket,
  Wallet,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/shared/auth/useAuth";
import { uploadAvatar, updatePassword } from "@/shared/auth/authApi";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [stats, setStats] = useState({ totalBookings: 0, totalSpend: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingStats(true);
      const [shuttle, hotel] = await Promise.all([
        supabase
          .from("shuttle_bookings")
          .select("code, rayon_name, date, time, total_price, status, created_at")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("hotel_bookings")
          .select("code, hotel_name, check_in, total_price, status, created_at")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      const sb = shuttle.data ?? [];
      const hb = hotel.data ?? [];
      const total = sb.reduce((s: number, r: any) => s + (r.total_price ?? 0), 0) +
        hb.reduce((s: number, r: any) => s + (r.total_price ?? 0), 0);
      setStats({ totalBookings: sb.length + hb.length, totalSpend: total });
      setRecent(sb.slice(0, 3));
      setLoadingStats(false);
    })();
  }, [user]);

  const onPickAvatar = () => fileRef.current?.click();

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      await uploadAvatar(user.id, file);
      await refreshProfile();
      toast.success("Foto profil diperbarui");
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, address, bio })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
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
    await signOut();
    navigate("/", { replace: true });
  };

  const initials = (fullName || profile?.full_name || user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ResponsiveLayout mobileTitle="Profil Saya" mobileBack="/shuttle">
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
                onClick={onPickAvatar}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition"
                aria-label="Ubah foto profil"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-lg truncate">{fullName || "Belum diisi"}</div>
              <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Ticket className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xs text-muted-foreground">Total Booking</div>
              <div className="text-2xl font-bold">{loadingStats ? "…" : stats.totalBookings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Wallet className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xs text-muted-foreground">Total Pembelian</div>
              <div className="text-base font-bold text-primary">
                {loadingStats ? "…" : formatRupiah(stats.totalSpend)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent */}
        {recent.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Booking Terakhir</CardTitle>
              <Link to="/shuttle/my-bookings" className="text-sm text-primary inline-flex items-center gap-1">
                Lihat semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recent.map((b) => (
                <div key={b.code} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{b.rayon_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {b.date} • {b.time}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{formatRupiah(b.total_price)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Pribadi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nama Lengkap</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div>
              <Label>Nomor HP</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <KeyRound className="h-4 w-4" /> Ubah Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ubah Password</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Password baru</Label>
                  <Input type="password" minLength={6} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                </div>
                <div>
                  <Label>Konfirmasi</Label>
                  <Input
                    type="password"
                    minLength={6}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleChangePw} disabled={pwBusy}>
                  {pwBusy ? "Menyimpan…" : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default CustomerProfile;
