import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Car } from "lucide-react";

const DriverLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/driver", { replace: true });
    });
  }, [navigate]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/driver`, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user) {
          // self-assign driver role (only allowed because we add a permissive insert below)
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "driver" }).select();
        }
        toast({ title: "Akun dibuat", description: "Silakan login." });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/driver", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Car className="h-7 w-7" />
          </div>
          <CardTitle>Driver PYU-GO</CardTitle>
          <CardDescription>{mode === "login" ? "Masuk ke akun driver" : "Daftar sebagai driver"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handle} className="space-y-3">
            {mode === "signup" && (
              <Input placeholder="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
            </Button>
          </form>
          <button
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            type="button"
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverLogin;
