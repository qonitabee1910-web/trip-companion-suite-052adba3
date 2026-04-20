import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, ShieldCheck } from "lucide-react";
import { updatePassword } from "@/shared/auth/authApi";
import { supabase } from "@/integrations/supabase/client";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // When the user clicks the email link, supabase parses the recovery token
    // from the URL hash and emits a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // also check existing session (link may already be processed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Password konfirmasi tidak cocok");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success("Password berhasil diubah");
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal mengubah password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            {ready
              ? "Masukkan password baru Anda."
              : "Memverifikasi link reset… Bila tidak otomatis, buka link reset dari email Anda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handle} className="space-y-3">
            <div>
              <Label>Password baru</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready}
              />
            </div>
            <div>
              <Label>Konfirmasi password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={!ready}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!ready || busy}>
              <KeyRound className="h-4 w-4" />
              {busy ? "Menyimpan…" : "Ubah Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
