/**
 * Payment gateway data layer.
 * Reads/writes payment_gateway settings from shuttle_settings.
 * Routes payment creation through Edge Function (mock-aware).
 */
import { supabase } from "@/integrations/supabase/client";
import { cloudCache, notifyStore } from "./cloudStore";

export type PaymentProvider = "mock" | "midtrans" | "xendit";
export type PaymentMode = "sandbox" | "production";

export type PaymentMethodId =
  | "qris"
  | "va_bca"
  | "va_bni"
  | "va_bri"
  | "va_mandiri"
  | "gopay"
  | "ovo"
  | "dana"
  | "shopeepay"
  | "credit_card"
  | "bank_transfer";

export interface PaymentMethodMeta {
  id: PaymentMethodId;
  label: string;
  group: "qris" | "va" | "ewallet" | "card" | "bank";
}

export const ALL_METHODS: PaymentMethodMeta[] = [
  { id: "qris", label: "QRIS", group: "qris" },
  { id: "va_bca", label: "VA BCA", group: "va" },
  { id: "va_bni", label: "VA BNI", group: "va" },
  { id: "va_bri", label: "VA BRI", group: "va" },
  { id: "va_mandiri", label: "VA Mandiri", group: "va" },
  { id: "gopay", label: "GoPay", group: "ewallet" },
  { id: "ovo", label: "OVO", group: "ewallet" },
  { id: "dana", label: "DANA", group: "ewallet" },
  { id: "shopeepay", label: "ShopeePay", group: "ewallet" },
  { id: "credit_card", label: "Kartu Kredit", group: "card" },
  { id: "bank_transfer", label: "Transfer Bank", group: "bank" },
];

export interface PaymentSettings {
  provider: PaymentProvider;
  mode: PaymentMode;
  methods: PaymentMethodId[];
  midtrans?: {
    serverKey?: string;
    clientKey?: string;
  };
  xendit?: {
    apiKey?: string;
    webhookToken?: string;
  };
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  provider: "mock",
  mode: "sandbox",
  methods: ["qris", "va_bca", "va_bni", "gopay", "ovo", "dana", "credit_card"],
};

const SETTINGS_KEY = "payment_gateway";

export function getPaymentSettings(): PaymentSettings {
  return cloudCache.paymentSettings ?? DEFAULT_PAYMENT_SETTINGS;
}

export async function loadPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from("shuttle_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (error) {
    console.error("[payment] load failed:", error);
    return DEFAULT_PAYMENT_SETTINGS;
  }
  if (!data) return DEFAULT_PAYMENT_SETTINGS;
  const merged = { ...DEFAULT_PAYMENT_SETTINGS, ...(data.value as object) } as PaymentSettings;
  cloudCache.paymentSettings = merged;
  notifyStore();
  return merged;
}

export async function savePaymentSettings(
  s: PaymentSettings,
): Promise<{ ok: boolean; error?: string }> {
  const previous = cloudCache.paymentSettings;
  cloudCache.paymentSettings = s;
  notifyStore();
  const { error } = await supabase
    .from("shuttle_settings")
    .upsert({ key: SETTINGS_KEY, value: s as any });
  if (error) {
    cloudCache.paymentSettings = previous;
    notifyStore();
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Get the methods that should be shown to the user (filtered + meta). */
export function getActivePaymentMethods(): PaymentMethodMeta[] {
  const s = getPaymentSettings();
  return ALL_METHODS.filter((m) => s.methods.includes(m.id));
}

export interface CreatePaymentResult {
  ok: boolean;
  ref: string;
  status: "pending" | "settled";
  redirectUrl?: string;
  mock: boolean;
  error?: string;
}

/**
 * Create a payment intent. In mock mode (or when credentials are missing) this
 * resolves immediately with a settled mock ref. In real mode it calls the
 * `create-payment` edge function which talks to Midtrans/Xendit.
 */
export async function createPayment(args: {
  amount: number;
  method: PaymentMethodId;
  customerName: string;
  customerPhone: string;
  description: string;
}): Promise<CreatePaymentResult> {
  const settings = getPaymentSettings();
  const isMockable =
    settings.provider === "mock" ||
    (settings.provider === "midtrans" && !settings.midtrans?.serverKey) ||
    (settings.provider === "xendit" && !settings.xendit?.apiKey);

  if (isMockable) {
    // Simulate a 1.2s gateway round-trip
    await new Promise((r) => setTimeout(r, 1200));
    return {
      ok: true,
      ref: `MOCK-${Date.now().toString().slice(-8)}`,
      status: "settled",
      mock: true,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("create-payment", {
      body: { ...args, provider: settings.provider, mode: settings.mode },
    });
    if (error) throw error;
    return {
      ok: true,
      ref: data?.ref ?? `REF-${Date.now()}`,
      status: data?.status ?? "pending",
      redirectUrl: data?.redirect_url,
      mock: false,
    };
  } catch (err: any) {
    console.error("[payment] createPayment failed:", err);
    return {
      ok: false,
      ref: "",
      status: "pending",
      mock: false,
      error: err?.message ?? "Payment creation failed",
    };
  }
}
