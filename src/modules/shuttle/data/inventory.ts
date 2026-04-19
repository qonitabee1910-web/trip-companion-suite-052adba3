/**
 * Seat inventory — combines admin-blocked seats (cloud) + already-booked seats.
 * Reads from cloudCache (sync) so existing UI works without await.
 */
import { cloudCache, setBlockedSeatsCloud } from "./cloudStore";
import { getBookings } from "./repository";

export interface SlotKey {
  date: string;
  time: string;
  rayonId: string;
  vehicleId: string;
  tier: string;
}

export function slotKeyString(s: SlotKey): string {
  return `${s.date}_${s.time}_${s.rayonId.toUpperCase()}_${s.vehicleId}_${s.tier}`;
}

function matches(b: { date: string; time: string; rayonId: string; vehicleId: string; tier: string }, slot: SlotKey) {
  return (
    b.date === slot.date &&
    b.time === slot.time &&
    b.rayonId.toUpperCase() === slot.rayonId.toUpperCase() &&
    b.vehicleId === slot.vehicleId &&
    b.tier === slot.tier
  );
}

export function getBlockedSeats(slot: SlotKey): number[] {
  return cloudCache.seatBlocks
    .filter((b) => matches(b, slot))
    .map((b) => b.seatNumber)
    .sort((a, b) => a - b);
}

export function setBlockedSeats(slot: SlotKey, seats: number[]) {
  // optimistic local update inside cloudStore
  void setBlockedSeatsCloud(slot, seats);
}

export function toggleBlockedSeat(slot: SlotKey, seat: number) {
  const current = getBlockedSeats(slot);
  setBlockedSeats(
    slot,
    current.includes(seat) ? current.filter((s) => s !== seat) : [...current, seat],
  );
}

export function getBookedSeats(slot: SlotKey): number[] {
  return getBookings()
    .filter(
      (b) =>
        b.status !== "cancelled" &&
        b.date === slot.date &&
        b.time === slot.time &&
        b.rayonId.toUpperCase() === slot.rayonId.toUpperCase() &&
        b.vehicleId === slot.vehicleId &&
        b.serviceTier === slot.tier,
    )
    .flatMap((b) => b.seats);
}

export function getOccupiedSeats(slot: SlotKey): number[] {
  return [...new Set([...getBookedSeats(slot), ...getBlockedSeats(slot)])].sort((a, b) => a - b);
}

export function getAvailableCount(slot: SlotKey, totalSeats: number): number {
  return Math.max(0, totalSeats - getOccupiedSeats(slot).length);
}
