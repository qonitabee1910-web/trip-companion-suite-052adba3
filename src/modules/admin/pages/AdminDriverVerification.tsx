import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  FileText,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/shared/auth/useAuth";

const DRIVER_DOCS_BUCKET = "driver-documents";

interface DriverRow {
  id: string;
  vehicle_type: string;
  plate: string | null;
  rating: number;
  sim_url: string | null;
  stnk_url: string | null;
  sim_expiry: string | null;
  verification_status: string | null;
  verified_at: string | null;
  verified_by: string | null;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
}

type DriverWithProfile = DriverRow & { profile?: ProfileRow };

const statusBadge = (status?: string | null) => {
  switch (status) {
    case "verified":
      return { label: "Terverifikasi", className: "bg-success/15 text-success border-success/30", Icon: ShieldCheck };
    case "rejected":
      return { label: "Ditolak", className: "bg-destructive/15 text-destructive border-destructive/30", Icon: ShieldX };
    default:
      return { label: "Pending", className: "bg-warning/15 text-warning border-warning/30", Icon: ShieldAlert };
  }
};

/** Convert a stored doc reference (signed URL OR storage path) into a fresh signed URL */
async function freshSignedUrl(driverId: string, kind: "sim" | "stnk", stored: string | null): Promise<string | null> {
  if (!stored) return null;
  // Try to derive the storage path: it is always `${driverId}/${kind}.{ext}` (see authApi.uploadDriverDoc).
  // We list the folder and pick the matching file to get the exact extension.
  const { data: files, error } = await supabase.storage.from(DRIVER_DOCS_BUCKET).list(driverId);
  if (error || !files) return null;
  const match = files.find((f) => f.name.startsWith(`${kind}.`));
  if (!match) return null;
  const { data, error: signErr } = await supabase.storage
    .from(DRIVER_DOCS_BUCKET)
    .createSignedUrl(`${driverId}/${match.name}`, 60 * 60); // 1 hour
  if (signErr) return null;
  return data?.signedUrl ?? null;
}

const AdminDriverVerification = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected">("pending");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<DriverWithProfile | null>(null);
  const [docUrls, setDocUrls] = useState<{ sim?: string | null; stnk?: string | null }>({});
  const [reason, setReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: drvs, error } = await supabase
      .from("drivers")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Gagal memuat data driver");
      setLoading(false);
      return;
    }
    const ids = (drvs ?? []).map((d) => d.id);
    let profiles: ProfileRow[] = [];
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, photo_url")
        .in("id", ids);
      profiles = (profs ?? []) as ProfileRow[];
    }
    const mapped: DriverWithProfile[] = (drvs ?? []).map((d) => ({
      ...d,
      profile: profiles.find((p) => p.id === d.id),
    }));
    setDrivers(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDriver = async (drv: DriverWithProfile) => {
    setSelected(drv);
    setReason("");
    setDocUrls({ sim: null, stnk: null });
    const [sim, stnk] = await Promise.all([
      freshSignedUrl(drv.id, "sim", drv.sim_url),
      freshSignedUrl(drv.id, "stnk", drv.stnk_url),
    ]);
    setDocUrls({ sim, stnk });
  };

  const sendNotification = async (driverId: string, status: "verified" | "rejected", note?: string) => {
    const title = status === "verified" ? "Dokumen Anda diverifikasi ✅" : "Dokumen Anda ditolak ❌";
    const body =
      status === "verified"
        ? "Selamat! Dokumen Anda telah diverifikasi. Anda sudah bisa menerima order."
        : `Dokumen Anda ditolak. ${note ? `Alasan: ${note}` : "Silakan upload ulang."}`;
    await supabase.from("notifications").insert({
      user_id: driverId,
      title,
      body,
      link: "/driver/profile",
      category: "verification",
    });
  };

  const setStatus = async (status: "verified" | "rejected" | "pending") => {
    if (!selected || !user) return;
    setActionBusy(true);
    const { error } = await supabase
      .from("drivers")
      .update({
        verification_status: status,
        verified_at: status === "verified" ? new Date().toISOString() : null,
        verified_by: status === "verified" ? user.id : null,
      })
      .eq("id", selected.id);
    if (error) {
      toast.error(error.message);
      setActionBusy(false);
      return;
    }
    if (status !== "pending") {
      await sendNotification(selected.id, status, reason);
    }
    toast.success(
      status === "verified"
        ? "Driver diverifikasi & notifikasi dikirim"
        : status === "rejected"
        ? "Driver ditolak & notifikasi dikirim"
        : "Status direset ke pending",
    );
    setActionBusy(false);
    setSelected(null);
    await load();
  };

  const filtered = drivers.filter((d) => {
    if (filter !== "all" && (d.verification_status ?? "pending") !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = d.profile?.full_name?.toLowerCase() ?? "";
      const email = d.profile?.email?.toLowerCase() ?? "";
      const plate = d.plate?.toLowerCase() ?? "";
      if (!name.includes(s) && !email.includes(s) && !plate.includes(s)) return false;
    }
    return true;
  });

  const counts = {
    all: drivers.length,
    pending: drivers.filter((d) => (d.verification_status ?? "pending") === "pending").length,
    verified: drivers.filter((d) => d.verification_status === "verified").length,
    rejected: drivers.filter((d) => d.verification_status === "rejected").length,
  };

  return (
    <AdminLayout title="Verifikasi Dokumen Driver">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Verifikasi Dokumen Driver
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              {(["pending", "verified", "rejected", "all"] as const).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={filter === k ? "default" : "outline"}
                  onClick={() => setFilter(k)}
                >
                  {k === "all" ? "Semua" : k === "pending" ? "Pending" : k === "verified" ? "Terverifikasi" : "Ditolak"}
                  <Badge variant="secondary" className="ml-1">
                    {counts[k]}
                  </Badge>
                </Button>
              ))}
              <div className="ml-auto relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-7 w-64"
                  placeholder="Cari nama / email / plat"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 text-sm">Tidak ada driver.</div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Dokumen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => {
                      const sb = statusBadge(d.verification_status);
                      const initials = (d.profile?.full_name ?? d.profile?.email ?? "D")
                        .split(" ")
                        .map((s) => s[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={d.profile?.photo_url ?? undefined} />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{d.profile?.full_name ?? "—"}</div>
                                <div className="text-xs text-muted-foreground truncate">{d.profile?.email ?? d.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{d.vehicle_type}</div>
                            <div className="text-xs text-muted-foreground">{d.plate ?? "—"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 text-xs">
                              <Badge variant={d.sim_url ? "default" : "outline"}>SIM {d.sim_url ? "✓" : "—"}</Badge>
                              <Badge variant={d.stnk_url ? "default" : "outline"}>STNK {d.stnk_url ? "✓" : "—"}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={sb.className}>
                              <sb.Icon className="h-3 w-3" /> {sb.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => openDriver(d)}>
                              <FileText className="h-3.5 w-3.5" /> Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail dialog */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Driver — {selected?.profile?.full_name ?? selected?.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>

            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Email</div>
                    <div className="font-medium truncate">{selected.profile?.email ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Telepon</div>
                    <div className="font-medium">{selected.profile?.phone ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Kendaraan</div>
                    <div className="font-medium">
                      {selected.vehicle_type} • {selected.plate ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">SIM kadaluarsa</div>
                    <div className="font-medium">{selected.sim_expiry ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Status saat ini</div>
                    <Badge variant="outline" className={statusBadge(selected.verification_status).className}>
                      {statusBadge(selected.verification_status).label}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Diverifikasi</div>
                    <div className="font-medium">
                      {selected.verified_at ? new Date(selected.verified_at).toLocaleString("id-ID") : "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DocPreview label="SIM" url={docUrls.sim ?? null} />
                  <DocPreview label="STNK" url={docUrls.stnk ?? null} />
                </div>

                <div>
                  <Label className="text-xs">Catatan / Alasan (opsional, dikirim ke driver)</Label>
                  <Textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Mis. foto SIM buram, harap upload ulang"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStatus("pending")} disabled={actionBusy}>
                Reset Pending
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStatus("rejected")}
                disabled={actionBusy}
              >
                {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                Tolak
              </Button>
              <Button
                onClick={() => setStatus("verified")}
                disabled={actionBusy}
                className="bg-success hover:bg-success/90"
              >
                {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verifikasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const DocPreview = ({ label, url }: { label: string; url: string | null }) => {
  if (!url) {
    return (
      <div className="border rounded-md p-4 text-center text-xs text-muted-foreground bg-muted/30">
        <FileText className="h-6 w-6 mx-auto mb-1 opacity-50" />
        {label} belum diupload
      </div>
    );
  }
  const isPdf = url.toLowerCase().includes(".pdf");
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between bg-muted/40 border-b">
        <span className="text-sm font-medium">{label}</span>
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
          Buka <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {isPdf ? (
        <iframe src={url} className="w-full h-64 bg-white" title={label} />
      ) : (
        <img src={url} alt={label} className="w-full h-64 object-contain bg-white" />
      )}
    </div>
  );
};

export default AdminDriverVerification;
