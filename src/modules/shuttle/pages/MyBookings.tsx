import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveLayout } from "@/shared/components/ResponsiveLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Download,
  FileImage,
  Loader2,
  LogOut,
  Bus,
} from "lucide-react";
import { toast } from "sonner";
import { TicketCard } from "../components/TicketCard";
import { downloadTicketPDF, downloadTicketPNG } from "../lib/exportTicket";
import { getDestination } from "../data/rayons";
import type { ShuttleBooking, BookingStatus } from "../types/booking";

const statusColor: Record<BookingStatus, string> = {
  confirmed: "bg-primary/10 text-primary border-primary/30",
  done: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

function rowToBooking(row: any): ShuttleBooking {
  return {
    id: row.code,
    rayonId: row.rayon_id,
    rayonName: row.rayon_name,
    pickup: row.pickup,
    date: row.date,
    time: row.time,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicle_label,
    serviceTier: row.service_tier,
    serviceLabel: row.service_label,
    seats: row.seats || [],
    pax: row.pax,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    status: row.status as BookingStatus,
    createdAt: row.created_at,
    paymentMethod: row.payment_method ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    paymentRef: row.payment_ref ?? undefined,
  };
}

const MyBookings = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<ShuttleBooking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ShuttleBooking | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);

  // RequireAuth in registry already guarantees we have a session here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      setUserEmail(data.user.email ?? null);
      await fetchBookings(data.user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchBookings = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shuttle_bookings")
        .select("*")
        .eq("customer_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBookings((data ?? []).map(rowToBooking));
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal memuat riwayat");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const ticketDomId = selected ? `ticket-export-${selected.id}` : "ticket-export";

  const handleDownload = async (kind: "pdf" | "png") => {
    if (!selected) return;
    setExporting(kind);
    try {
      if (kind === "pdf") await downloadTicketPDF(ticketDomId, selected.id);
      else await downloadTicketPNG(ticketDomId, selected.id);
      toast.success(`Tiket ${kind.toUpperCase()} ter-download`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal generate tiket");
    } finally {
      setExporting(null);
    }
  };

  const empty = useMemo(() => !loading && bookings && bookings.length === 0, [loading, bookings]);

  // RequireAuth handles auth gating; no local auth-loading state needed.


  return (
    <ResponsiveLayout
      mobileTitle="Riwayat Booking"
      mobileBack="/shuttle"
      mobileHeaderRight={
        <Button size="sm" variant="ghost" onClick={handleLogout} className="text-primary-foreground hover:bg-white/10">
          <LogOut className="h-4 w-4" />
        </Button>
      }
    >
      <div className="container mx-auto max-w-3xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" /> Riwayat Booking
            </h1>
            {userEmail && (
              <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleLogout} className="hidden md:inline-flex">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        {loading && (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {empty && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Bus className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada booking. Booking yang dibuat saat login akan muncul di sini.
              </p>
              <Button onClick={() => navigate("/shuttle")}>Booking Sekarang</Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {bookings?.map((b) => {
            const d = parseISO(b.date);
            const dateLabel = isValid(d)
              ? format(d, "EEE, d MMM yyyy", { locale: localeId })
              : b.date;
            return (
              <Card
                key={b.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelected(b)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-muted-foreground">{b.id}</div>
                      <div className="font-semibold truncate">{b.rayonName}</div>
                    </div>
                    <Badge variant="outline" className={statusColor[b.status]}>
                      {b.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {dateLabel}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {b.time}
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {b.pickup}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {b.vehicleLabel} • {b.serviceLabel} • Kursi {b.seats.join(", ")}
                    </span>
                    <span className="font-bold text-sm text-success">
                      Rp{b.totalPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" /> E-Ticket
            </SheetTitle>
            <SheetDescription className="font-mono text-xs">{selected?.id}</SheetDescription>
          </SheetHeader>

          {selected && (
            <>
              <div className="mt-4">
                <TicketCard
                  booking={selected}
                  destinationLabel={getDestination().short}
                  id={ticketDomId}
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button onClick={() => handleDownload("pdf")} disabled={!!exporting} variant="outline">
                  {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  PDF
                </Button>
                <Button onClick={() => handleDownload("png")} disabled={!!exporting} variant="outline">
                  {exporting === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
                  PNG
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </ResponsiveLayout>
  );
};

export default MyBookings;
