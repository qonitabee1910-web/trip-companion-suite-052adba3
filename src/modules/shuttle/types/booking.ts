export type BookingStatus = "confirmed" | "done" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ShuttleBooking {
  id: string;
  rayonId: string;
  rayonName: string;
  pickup: string;
  date: string; // yyyy-MM-dd
  time: string;
  vehicleId: string;
  vehicleLabel: string;
  serviceTier: string;
  serviceLabel: string;
  seats: number[];
  pax: number;
  unitPrice: number;
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  status: BookingStatus;
  createdAt: string; // ISO
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  paymentRef?: string;
}
