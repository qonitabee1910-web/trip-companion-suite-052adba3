import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileImage, MessageCircle, Ticket, Loader2 } from "lucide-react";
import { TicketCard } from "@/modules/shuttle/components/TicketCard";
import { downloadTicketPDF, downloadTicketPNG } from "@/modules/shuttle/lib/exportTicket";
import { getDestination } from "@/modules/shuttle/data/rayons";
import type { ShuttleBooking, BookingStatus } from "@/modules/shuttle/types/booking";
import { toast } from "sonner";

interface Props {
  booking: ShuttleBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColor: Record<BookingStatus, string> = {
  confirmed: "bg-primary/10 text-primary border-primary/30",
  done: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export function BookingDetailDrawer({ booking, open, onOpenChange }: Props) {
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  if (!booking) return null;

  const d = parseISO(booking.date);
  const dateLabel = isValid(d)
    ? format(d, "EEEE, d MMMM yyyy", { locale: localeId })
    : booking.date;

  const ticketDomId = `ticket-export-${booking.id}`;

  const handleDownload = async (kind: "pdf" | "png") => {
    setExporting(kind);
    try {
      if (kind === "pdf") await downloadTicketPDF(ticketDomId, booking.id);
      else await downloadTicketPNG(ticketDomId, booking.id);
      toast.success(`Tiket ${kind.toUpperCase()} ter-download`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal generate tiket");
    } finally {
      setExporting(null);
    }
  };

  const handleSendWhatsApp = () => {
    const phone = booking.customerPhone.replace(/\D/g, "").replace(/^0/, "62");
    const lines = [
      `*E-TICKET SHUTTLE* 🚐`,
      `ID: *${booking.id}*`,
      ``,
      `Halo ${booking.customerName}, berikut e-ticket Anda:`,
      ``,
      `📍 *Rayon:* ${booking.rayonName}`,
      `📌 *Jemput:* ${booking.pickup}`,
      `📅 *Tanggal:* ${dateLabel}`,
      `⏰ *Berangkat:* ${booking.time}`,
      `🚐 *Kendaraan:* ${booking.vehicleLabel}`,
      `⭐ *Service:* ${booking.serviceLabel}`,
      `💺 *Kursi:* ${booking.seats.join(", ")} (${booking.pax} pax)`,
      `💰 *Total:* Rp${booking.totalPrice.toLocaleString("id-ID")}`,
      ``,
      `Tunjukkan kode booking *${booking.id}* ke petugas saat penjemputan.`,
    ];
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between gap-2">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" /> Detail Booking
              </SheetTitle>
              <SheetDescription className="font-mono text-xs">{booking.id}</SheetDescription>
            </div>
            <Badge variant="outline" className={statusColor[booking.status]}>
              {booking.status}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-4">
          <TicketCard
            booking={booking}
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

        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            onClick={handleSendWhatsApp}
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
          >
            <MessageCircle className="h-4 w-4" /> Kirim via WhatsApp
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
