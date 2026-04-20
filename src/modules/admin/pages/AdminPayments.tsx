import { useEffect, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreditCard, AlertTriangle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_METHODS,
  DEFAULT_PAYMENT_SETTINGS,
  loadPaymentSettings,
  savePaymentSettings,
  type PaymentSettings,
  type PaymentProvider,
  type PaymentMode,
  type PaymentMethodId,
} from "@/modules/shuttle/data/payment";

const PROVIDERS: { id: PaymentProvider; label: string; description: string }[] = [
  { id: "mock", label: "Mock (Simulasi)", description: "Auto-success — untuk testing tanpa biaya nyata." },
  { id: "midtrans", label: "Midtrans", description: "Snap API — populer di Indonesia." },
  { id: "xendit", label: "Xendit", description: "Invoice API — multi-channel." },
];

export default function AdminPayments() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPaymentSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const toggleMethod = (id: PaymentMethodId) => {
    setSettings((s) => ({
      ...s,
      methods: s.methods.includes(id)
        ? s.methods.filter((m) => m !== id)
        : [...s.methods, id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await savePaymentSettings(settings);
    setSaving(false);
    if (res.ok) toast.success("Pengaturan pembayaran tersimpan");
    else toast.error(res.error || "Gagal menyimpan");
  };

  if (loading) {
    return (
      <AdminLayout title="Pengaturan Pembayaran">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const credentialsMissing =
    (settings.provider === "midtrans" && !settings.midtrans?.serverKey) ||
    (settings.provider === "xendit" && !settings.xendit?.apiKey);

  return (
    <AdminLayout title="Pengaturan Pembayaran">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" /> Pengaturan Pembayaran
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Atur payment gateway dan metode bayar yang ditampilkan ke user.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan
          </Button>
        </div>

        {/* Provider */}
        <Card className="p-4 md:p-6 space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Provider Aktif</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, provider: p.id }))}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    settings.provider === p.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{p.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Mode</h3>
            <div className="flex gap-2">
              {(["sandbox", "production"] as PaymentMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, mode: m }))}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    settings.mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {m === "sandbox" ? "Sandbox" : "Production"}
                </button>
              ))}
            </div>
          </div>

          {credentialsMissing && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Credentials kosong — payment akan otomatis fallback ke <strong>Mock mode</strong>.
              </AlertDescription>
            </Alert>
          )}
        </Card>

        {/* Credentials */}
        <Card className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Credentials</h2>
            <Badge variant="outline" className="text-xs">
              {settings.mode === "sandbox" ? "SANDBOX" : "PRODUCTION"}
            </Badge>
          </div>
          <Alert variant="default" className="border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs">
              Untuk produksi, sebaiknya simpan server key sebagai <strong>secret edge function</strong>{" "}
              alih-alih di database.
            </AlertDescription>
          </Alert>

          <Tabs value={settings.provider === "xendit" ? "xendit" : "midtrans"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="midtrans"
                onClick={() => setSettings((s) => ({ ...s, provider: "midtrans" }))}
              >
                Midtrans
              </TabsTrigger>
              <TabsTrigger
                value="xendit"
                onClick={() => setSettings((s) => ({ ...s, provider: "xendit" }))}
              >
                Xendit
              </TabsTrigger>
            </TabsList>
            <TabsContent value="midtrans" className="space-y-3 mt-4">
              <div>
                <Label>Server Key</Label>
                <Input
                  type="password"
                  placeholder="SB-Mid-server-..."
                  value={settings.midtrans?.serverKey ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      midtrans: { ...s.midtrans, serverKey: e.target.value },
                    }))
                  }
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Client Key</Label>
                <Input
                  placeholder="SB-Mid-client-..."
                  value={settings.midtrans?.clientKey ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      midtrans: { ...s.midtrans, clientKey: e.target.value },
                    }))
                  }
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </TabsContent>
            <TabsContent value="xendit" className="space-y-3 mt-4">
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="xnd_development_..."
                  value={settings.xendit?.apiKey ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xendit: { ...s.xendit, apiKey: e.target.value },
                    }))
                  }
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Webhook Verification Token</Label>
                <Input
                  placeholder="optional"
                  value={settings.xendit?.webhookToken ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xendit: { ...s.xendit, webhookToken: e.target.value },
                    }))
                  }
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Methods */}
        <Card className="p-4 md:p-6 space-y-3">
          <div>
            <h2 className="font-semibold">Metode Pembayaran Aktif</h2>
            <p className="text-xs text-muted-foreground">
              Pilih metode yang ditampilkan ke user saat checkout.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {ALL_METHODS.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={settings.methods.includes(m.id)}
                  onCheckedChange={() => toggleMethod(m.id)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground uppercase">{m.group}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Pengaturan
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
