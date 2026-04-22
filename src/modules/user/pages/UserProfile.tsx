/**
 * Generic User Profile Page
 * Works for riders, drivers, admins - separated from role-specific profile pages
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
    Loader2,
    ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/shared/auth/useAuth";
import { uploadUserAvatar, updateUserProfile } from "../data/userApi";
import { updatePassword } from "@/shared/auth/authApi";

const UserProfile = () => {
    const navigate = useNavigate();
    const { user, profile, refreshProfile, signOut } = useAuth();
    const avatarRef = useRef<HTMLInputElement>(null);

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [bio, setBio] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

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

    const handleAvatarPick = () => avatarRef.current?.click();

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        try {
            await uploadUserAvatar(user.id, file);
            await refreshProfile();
            toast.success("Foto profil diperbarui");
        } catch (err: any) {
            toast.error(err?.message ?? "Gagal upload foto");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateUserProfile(user.id, {
                full_name: fullName,
                phone,
                address,
                bio,
            });
            await refreshProfile();
            toast.success("Profil tersimpan");
        } catch (err: any) {
            toast.error(err?.message ?? "Gagal menyimpan profil");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPw !== confirmPw) {
            toast.error("Konfirmasi password tidak cocok");
            return;
        }
        if (newPw.length < 6) {
            toast.error("Password minimal 6 karakter");
            return;
        }
        setPwBusy(true);
        try {
            await updatePassword(newPw);
            toast.success("Password berhasil diubah");
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
        try {
            await signOut();
            navigate("/auth", { replace: true });
        } catch (err: any) {
            toast.error("Gagal logout");
        }
    };

    const initials = (fullName || profile?.full_name || user?.email || "U")
        .split(" ")
        .map((s: string) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="min-h-screen bg-muted/20 pb-12">
            {/* Header */}
            <div className="bg-card border-b px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1.5 hover:bg-muted rounded-lg transition"
                    aria-label="Kembali"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="font-semibold text-lg">Profil Saya</h1>
            </div>

            <div className="container max-w-2xl mx-auto p-4 space-y-4">
                {/* Avatar Section */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={profile?.photo_url ?? undefined} />
                                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                                </Avatar>
                                <button
                                    onClick={handleAvatarPick}
                                    disabled={uploading}
                                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition disabled:opacity-50"
                                    aria-label="Ubah foto profil"
                                >
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                </button>
                                <input
                                    ref={avatarRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={handleAvatarChange}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-lg font-bold truncate">{fullName || "Belum diisi"}</div>
                                <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Profile Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Informasi Pribadi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="fullname">Nama Lengkap</Label>
                            <Input
                                id="fullname"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Nama Anda"
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={user?.email ?? ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Nomor HP</Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+62 8xx xxxx xxxx"
                            />
                        </div>
                        <div>
                            <Label htmlFor="address">Alamat</Label>
                            <Input
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Alamat lengkap Anda"
                            />
                        </div>
                        <div>
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                                id="bio"
                                rows={3}
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tulis sesuatu tentang Anda (opsional)"
                            />
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="w-full">
                            <Save className="h-4 w-4" />
                            {saving ? "Menyimpan…" : "Simpan Perubahan"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Account Actions */}
                <Card>
                    <CardContent className="pt-6 space-y-2">
                        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <KeyRound className="h-4 w-4" />
                                    Ubah Password
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Ubah Password</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="newpw">Password Baru</Label>
                                        <Input
                                            id="newpw"
                                            type="password"
                                            minLength={6}
                                            value={newPw}
                                            onChange={(e) => setNewPw(e.target.value)}
                                            placeholder="Minimal 6 karakter"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="confirmpw">Konfirmasi Password</Label>
                                        <Input
                                            id="confirmpw"
                                            type="password"
                                            minLength={6}
                                            value={confirmPw}
                                            onChange={(e) => setConfirmPw(e.target.value)}
                                            placeholder="Ulangi password baru"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button onClick={handleChangePassword} disabled={pwBusy}>
                                        {pwBusy ? "Menyimpan…" : "Ubah Password"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={handleLogout} variant="destructive" className="w-full">
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UserProfile;
