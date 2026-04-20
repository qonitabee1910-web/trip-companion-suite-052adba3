

## Plan: Modul Metode Bayar (Midtrans/Xendit-ready) + Download Tiket

### Konteks
Saat ini `ShuttleBooking.tsx` langsung `addBooking` saat klik "Bayar" — tidak ada step pilih metode pembayaran, tidak ada gateway, dan tiket sukses hanya ditampilkan di layar (tidak bisa di-download). Admin juga belum punya halaman untuk konfigurasi payment gateway.

### Arsitektur

```text
Booking Flow:
seat → form → [BARU] payment → success (with download)

Settings Source:
shuttle_settings(key='payment_gateway') → { provider, mode, methods[], midtrans?, xendit? }
                ↓ admin write       ↑ public read (untuk tampilkan metode aktif)
        AdminPayments page                BookingPayment step
```

### 1. Admin: Halaman Pengaturan Payment Gateway

**File baru:** `src/modules/admin/pages/AdminPayments.tsx`
- Form admin pilih:
  - Provider aktif: **Midtrans** / **Xendit** / **Mock (Simulasi)**
  - Mode: **Sandbox** / **Production**
  - Metode pembayaran yang ditampilkan ke user (checklist): QRIS, Virtual Account (BCA/BNI/BRI/Mandiri), GoPay, OVO, DANA, ShopeePay, Credit Card, Bank Transfer
  - Field credentials per provider (slot siap, optional):
    - Midtrans: Server Key, Client Key
    - Xendit: API Key, Webhook Token
  - Catatan: jika kosong → otomatis fallback ke mode Mock
- Simpan ke `shuttle_settings` key=`payment_gateway` (JSONB).
- **Penting**: server keys disimpan di JSONB (acceptable untuk demo), tapi UI tampilkan warning "untuk produksi pindahkan ke Edge Function secrets".

**Daftar di manifest:** `src/modules/admin/index.ts` → tambah adminRoute `/admin/payments` dengan icon `CreditCard`, group "Setup Layanan", order 50.

### 2. Data Layer

**File baru:** `src/modules/shuttle/data/payment.ts`
- Type `PaymentSettings`, `PaymentMethod`, `PaymentProvider`.
- `getPaymentSettings()` baca dari `cloudCache` (settings sudah dihydrate via existing settings refetch).
- `savePaymentSettings(settings)` → upsert ke `shuttle_settings`.
- `createPayment(booking, method)`:
  - Jika provider = `mock` atau credentials kosong → return `{ status: "pending", id: "MOCK-xxx" }` lalu otomatis sukses setelah 2 detik (simulator).
  - Jika provider = `midtrans`/`xendit` → panggil edge function `create-payment` (lihat #4).

**Update `cloudStore.ts`:** tambah `paymentSettings` ke cache + load dari `shuttle_settings` key=`payment_gateway`.

**Update `ShuttleBooking` type:** tambah field optional `paymentMethod`, `paymentStatus`, `paymentRef`. Migration ringan untuk `shuttle_bookings` (kolom nullable).

### 3. Step "Payment" di Booking Flow

**Update `ShuttleBooking.tsx`:**
- Tambah step `"payment"` antara `form` dan `success`.
- Setelah isi data → tombol jadi "Lanjut ke Pembayaran" → step payment.
- Step payment menampilkan:
  - Ringkasan total
  - Pilih metode (filter berdasarkan `methods[]` aktif dari admin)
  - Tombol "Bayar Sekarang"
- Klik bayar → `createPayment()` → loading state → success (simulator) atau redirect ke Snap (Midtrans) / Invoice URL (Xendit).
- Jika sukses → `addBooking({ ..., paymentMethod, paymentStatus: "paid" })` → masuk step success.

**File baru:** `src/modules/shuttle/components/PaymentMethodPicker.tsx` — grid pilihan metode dengan icon (lucide: QrCode, CreditCard, Wallet, Building2).

### 4. Edge Function (struktur siap real, sekarang mock-aware)

**File baru:** `supabase/functions/create-payment/index.ts`
- Input: `{ bookingDraft, method, provider }`.
- Baca settings dari `shuttle_settings` (service role).
- Jika `provider === "midtrans"` & server key ada → call Midtrans Snap API → return `{ token, redirect_url }`.
- Jika `provider === "xendit"` & key ada → call Xendit Invoice API → return `{ invoice_url }`.
- Else → return `{ mock: true, status: "settled" }`.
- Validasi input dengan Zod, CORS headers, `verify_jwt = false` (guest checkout).

**File baru:** `supabase/functions/payment-webhook/index.ts` — placeholder untuk callback (skeleton, log only). User tinggal update status booking nanti saat aktifkan real mode.

### 5. Download Tiket (PDF + PNG)

**Dependencies tambah:**
- `jspdf` — generate PDF
- `html-to-image` — generate PNG dari DOM

**File baru:** `src/modules/shuttle/components/TicketCard.tsx`
- Komponen tiket terpadu (dipakai di success page + AdminBookings drawer).
- Berisi: header brand, QR code (existing `qrcode.react`), barcode kode booking (pakai `react-barcode` atau JsBarcode lewat svg manual — **akan pakai `react-barcode`** untuk simple), semua detail booking (rayon, pickup, tujuan, tanggal, jam, kendaraan, service, kursi, pax, customer, total, metode bayar, status), footer instruksi.
- Layout fixed-width (380px) supaya konsisten saat di-export.

**File baru:** `src/modules/shuttle/lib/exportTicket.ts`
- `downloadTicketPDF(elementId, bookingId)` — html-to-image → JPEG → embed ke jsPDF A6, save sebagai `Ticket-${bookingId}.pdf`.
- `downloadTicketPNG(elementId, bookingId)` — html-to-image langsung → save `.png`.

**Update success step di `ShuttleBooking.tsx`:**
- Render `<TicketCard id="ticket-export" booking={...} />`
- 2 tombol: "Download PDF" + "Download PNG"
- Tombol "Kembali ke Beranda"

**Update `BookingDetailDrawer.tsx`:**
- Replace area print dengan `<TicketCard>`.
- Tambah tombol "Download PDF" + "Download PNG" sejajar tombol WhatsApp/Cetak.

### 6. Database Migration

```sql
ALTER TABLE shuttle_bookings 
  ADD COLUMN payment_method text,
  ADD COLUMN payment_status text DEFAULT 'paid',
  ADD COLUMN payment_ref text;
```
RLS existing tetap berlaku. Tidak butuh tabel baru karena settings disimpan di `shuttle_settings`.

### 7. Manifest Update

`src/modules/admin/index.ts`:
```ts
{
  path: "/admin/payments",
  element: lazyEl(() => import("./pages/AdminPayments")),
  sidebar: { label: "Pembayaran", icon: CreditCard, group: "Setup Layanan", order: 50 },
}
```

### File Summary

**NEW**
- `src/modules/admin/pages/AdminPayments.tsx`
- `src/modules/shuttle/data/payment.ts`
- `src/modules/shuttle/components/PaymentMethodPicker.tsx`
- `src/modules/shuttle/components/TicketCard.tsx`
- `src/modules/shuttle/lib/exportTicket.ts`
- `supabase/functions/create-payment/index.ts`
- `supabase/functions/payment-webhook/index.ts`

**EDIT**
- `src/modules/shuttle/pages/ShuttleBooking.tsx` — tambah step payment + TicketCard di success
- `src/modules/shuttle/data/cloudStore.ts` — load/save paymentSettings
- `src/modules/shuttle/types/booking.ts` — field payment
- `src/modules/admin/index.ts` — registrasi route AdminPayments
- `src/modules/admin/components/BookingDetailDrawer.tsx` — pakai TicketCard + tombol download

**Dependencies baru**: `jspdf`, `html-to-image`, `react-barcode`

**Migration**: 1 ALTER TABLE untuk kolom payment di `shuttle_bookings`

### Tidak Termasuk
- Tidak setup webhook real callback handling end-to-end (skeleton saja).
- Tidak refund flow.
- Tidak simpan riwayat payment terpisah (cukup field di booking).
- Email tiket otomatis (bisa fitur lanjutan).

### Hasil
- **User flow**: pilih kursi → isi data → **pilih metode bayar** (QRIS/VA/E-Wallet/dll) → bayar (mock auto-success 2 detik) → **download tiket PDF/PNG** lengkap dengan QR + barcode.
- **Admin flow**: `/admin/payments` → pilih provider (Midtrans/Xendit/Mock), mode, metode aktif, isi credentials → settings tersimpan → langsung berlaku di booking flow.
- **Real mode**: tinggal isi server key di admin (atau lebih aman: update edge function pakai env var) → otomatis pakai Midtrans Snap / Xendit Invoice.
- **Tiket**: bisa di-download PDF (cetak) atau PNG (share WA/IG), berisi QR + barcode + semua detail booking + status pembayaran.

