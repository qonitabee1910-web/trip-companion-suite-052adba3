import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Bus, MapPin, Calendar, Clock, User, Phone, Armchair, CreditCard } from "lucide-react";
import type { ShuttleBooking } from "../types/booking";

interface Props {
  booking: ShuttleBooking;
  destinationLabel?: string;
  /** DOM id used by the export helper. */
  id?: string;
}

/**
 * Standalone ticket card — fixed width 380px so PDF/PNG exports look consistent.
 * Uses inline-safe styles (no oklch) for html-to-image compatibility.
 */
export function TicketCard({ booking, destinationLabel, id = "ticket-export" }: Props) {
  const d = parseISO(booking.date);
  const dateLabel = isValid(d)
    ? format(d, "EEEE, d MMMM yyyy", { locale: localeId })
    : booking.date;

  const paymentLabel = booking.paymentMethod ?? "—";
  const paymentStatus = booking.paymentStatus ?? "paid";

  return (
    <div
      id={id}
      style={{
        width: 380,
        background: "#ffffff",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="mx-auto rounded-xl shadow-lg overflow-hidden border border-slate-200"
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "#ffffff",
          padding: "16px 20px",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            <span className="font-bold text-base tracking-wide">E-TICKET SHUTTLE</span>
          </div>
          <span
            style={{
              background: "rgba(255,255,255,0.2)",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {paymentStatus}
          </span>
        </div>
        <div className="mt-2 text-xs opacity-90">Booking ID</div>
        <div className="font-mono font-bold text-lg tracking-wider">{booking.id}</div>
      </div>

      {/* QR */}
      <div className="flex flex-col items-center py-4 border-b border-dashed border-slate-300">
        <div style={{ background: "#fff", padding: 8, borderRadius: 6 }}>
          <QRCodeSVG value={booking.id} size={120} level="M" />
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Tunjukkan QR ke petugas saat boarding
        </p>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3 text-sm">
        {/* Trip */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5" style={{ color: "#2563eb" }} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{booking.rayonName}</div>
            <div className="text-xs text-slate-500 truncate">{booking.pickup}</div>
            {destinationLabel && (
              <div className="text-xs text-slate-700 mt-0.5">→ {destinationLabel}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: "#64748b" }} />
            <span className="text-xs">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: "#64748b" }} />
            <span className="text-xs font-semibold">{booking.time}</span>
          </div>
        </div>

        <div
          style={{ borderTop: "1px dashed #cbd5e1" }}
          className="pt-3 space-y-1.5 text-xs"
        >
          <Row label="Kendaraan" value={booking.vehicleLabel} />
          <Row label="Service" value={booking.serviceLabel} />
          <Row
            label="Kursi"
            value={`${booking.seats.join(", ")} (${booking.pax} pax)`}
          />
        </div>

        {/* Customer */}
        <div
          style={{ borderTop: "1px dashed #cbd5e1" }}
          className="pt-3 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5" style={{ color: "#64748b" }} />
            <span>{booking.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-3.5 w-3.5" style={{ color: "#64748b" }} />
            <span>{booking.customerPhone}</span>
          </div>
        </div>

        {/* Payment */}
        <div
          style={{ borderTop: "1px dashed #cbd5e1" }}
          className="pt-3 space-y-1.5 text-xs"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5" style={{ color: "#64748b" }} />
            <span className="text-slate-600">Metode</span>
            <span className="ml-auto font-medium uppercase">{paymentLabel}</span>
          </div>
          {booking.paymentRef && (
            <div className="flex justify-between">
              <span className="text-slate-600">Ref</span>
              <span className="font-mono text-[10px]">{booking.paymentRef}</span>
            </div>
          )}
          <div
            className="flex justify-between pt-2"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <span className="font-semibold">TOTAL</span>
            <span
              className="font-bold text-base"
              style={{ color: "#16a34a" }}
            >
              Rp{booking.totalPrice.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Barcode */}
        <div className="flex justify-center pt-2">
          <Barcode
            value={booking.id}
            format="CODE128"
            width={1.4}
            height={40}
            displayValue={false}
            margin={0}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{ background: "#f1f5f9", padding: "10px 20px" }}
        className="text-center"
      >
        <p className="text-[10px] text-slate-600">
          Tiket ini bukti perjalanan resmi. Datang 15 menit sebelum keberangkatan.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}
