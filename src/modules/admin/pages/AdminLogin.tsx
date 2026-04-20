import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, LogOut } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; isAdmin: boolean } | null>(null);

  const refreshStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCurrentUser(null); return; }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setCurrentUser({ email: user.email ?? "", isAdmin: isAdmin === true });
  };

  useEffect(() => { refreshStatus(); }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const redirectUrl = `${window.location.origin}/admin/login`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Cek email untuk konfirmasi (atau langsung login bila auto-confirm aktif).");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login berhasil");
        await refreshStatus();
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal autentikasi");
    } finally {
      setLoading(false);
    }
  };

  const grantAdmin = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("grant_admin_by_email", { _email: currentUser.email });
      if (error) throw error;
      if (data === "ok") {
        toast.success("Role admin berhasil diberikan ke akun Anda");
        await refreshStatus();
      } else {
        toast.error("User tidak ditemukan");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal grant admin");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    toast.success("Logout berhasil");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />Admin Access
          </CardTitle>
          <CardDescription>
            Login untuk mengelola seat layout, rayon, dan booking shuttle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div>Email: <span className="font-medium">{currentUser.email}</span></div>
                <div className="mt-1">
                  Role:{" "}
                  <span className={currentUser.isAdmin ? "font-semibold text-primary" : "text-muted-foreground"}>
                    {currentUser.isAdmin ? "✓ Admin" : "Belum admin"}
                  </span>
                </div>
              </div>
              {!currentUser.isAdmin && (
                <Button onClick={grantAdmin} disabled={loading} className="w-full">
                  Grant role admin ke akun ini
                </Button>
              )}
              {currentUser.isAdmin && (
                <Button onClick={() => navigate("/admin")} className="w-full">
                  Buka Admin Dashboard
                </Button>
              )}
              <Button onClick={logout} variant="ghost" className="w-full">
                <LogOut className="h-4 w-4" />Logout
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Memproses…" : mode === "login" ? "Login" : "Sign up"}
                </Button>
              </form>
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                {mode === "login" ? "Belum punya akun? Sign up" : "Sudah punya akun? Login"}
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
