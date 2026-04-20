import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Sparkles, User, Car, LogIn, UserPlus, KeyRound } from "lucide-react";
import { useAuth } from "@/shared/auth/useAuth";
import { signIn, signUpWithRole, requestPasswordReset, type SignupRole } from "@/shared/auth/authApi";

const AuthPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, roles, loading } = useAuth();

  const initialRole = (params.get("role") as SignupRole) === "driver" ? "driver" : "rider";
  const initialTab = params.get("tab") === "signup" ? "signup" : "login";
  const fromPath = params.get("from");

  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [signupRole, setSignupRole] = useState<SignupRole>(initialRole);

  // login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // signup form
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [phone, setPhone] = useState("");

  // forgot
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [busy, setBusy] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (loading || !user) return;
    if (roles.includes("admin")) {
      navigate("/admin", { replace: true });
    } else if (roles.includes("driver")) {
      navigate(fromPath ?? "/driver", { replace: true });
    } else {
      navigate(fromPath ?? "/shuttle", { replace: true });
    }
  }, [user, roles, loading, navigate, fromPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast.success("Login berhasil");
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal login");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupRole === "driver" && !phone.trim()) {
      toast.error("Driver wajib mengisi nomor HP");
      return;
    }
    setBusy(true);
    try {
      await signUpWithRole({
        email: signupEmail,
        password: signupPassword,
        fullName,
        phone: phone || undefined,
        role: signupRole,
      });
      toast.success("Akun dibuat. Silakan login.");
      setTab("login");
      setLoginEmail(signupEmail);
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal mendaftar");
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setBusy(true);
    try {
      await requestPasswordReset(forgotEmail);
      toast.success("Email reset password telah dikirim");
      setForgotOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal mengirim email reset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">PYU-GO</CardTitle>
          <CardDescription>Masuk atau buat akun untuk menggunakan layanan</CardDescription>
        </CardHeader>
        <CardContent>
          {forgotOpen ? (
            <form onSubmit={handleForgot} className="space-y-3">
              <div>
                <Label>Email akun Anda</Label>
                <Input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="email@contoh.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Kami akan mengirim link untuk reset password.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                <KeyRound className="h-4 w-4" />
                {busy ? "Mengirim…" : "Kirim Link Reset"}
              </Button>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Kembali ke login
              </button>
            </form>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-3 mt-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    <LogIn className="h-4 w-4" />
                    {busy ? "Memproses…" : "Login"}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="w-full text-sm text-primary hover:underline"
                >
                  Lupa password?
                </button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 mt-4">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div>
                    <Label>Daftar sebagai</Label>
                    <RadioGroup
                      value={signupRole}
                      onValueChange={(v) => setSignupRole(v as SignupRole)}
                      className="grid grid-cols-2 gap-2 mt-1"
                    >
                      <label
                        className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${
                          signupRole === "rider" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value="rider" />
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Customer</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${
                          signupRole === "driver" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value="driver" />
                        <Car className="h-4 w-4" />
                        <span className="text-sm font-medium">Driver</span>
                      </label>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Nama Lengkap</Label>
                    <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>
                      Nomor HP {signupRole === "driver" && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      type="tel"
                      required={signupRole === "driver"}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08…"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    <UserPlus className="h-4 w-4" />
                    {busy ? "Memproses…" : "Buat Akun"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            Admin? <Link to="/admin/login" className="text-primary hover:underline">Login admin</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
