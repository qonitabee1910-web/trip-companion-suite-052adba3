/**
 * Create a payment intent via Midtrans Snap or Xendit Invoice.
 * Falls back to mock mode when credentials are missing.
 *
 * verify_jwt = false (guest checkout)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  amount: z.number().int().positive(),
  method: z.string().min(1).max(40),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(4).max(40),
  description: z.string().min(1).max(200),
  provider: z.enum(["mock", "midtrans", "xendit"]),
  mode: z.enum(["sandbox", "production"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { amount, method, customerName, customerPhone, description, provider, mode } =
      parsed.data;

    // Load credentials from shuttle_settings via service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: settingsRow } = await supabase
      .from("shuttle_settings")
      .select("value")
      .eq("key", "payment_gateway")
      .maybeSingle();
    const settings = (settingsRow?.value ?? {}) as any;

    const orderId = `TRV-${Date.now()}`;

    // ---- Midtrans ----
    if (provider === "midtrans") {
      const serverKey = settings?.midtrans?.serverKey;
      if (!serverKey) return mockResponse(orderId);
      const baseUrl =
        mode === "production"
          ? "https://app.midtrans.com/snap/v1/transactions"
          : "https://app.sandbox.midtrans.com/snap/v1/transactions";
      const auth = btoa(`${serverKey}:`);
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          transaction_details: { order_id: orderId, gross_amount: amount },
          customer_details: {
            first_name: customerName,
            phone: customerPhone,
          },
          item_details: [
            { id: "shuttle-1", name: description.slice(0, 50), quantity: 1, price: amount },
          ],
          enabled_payments: [method],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[midtrans] error:", text);
        return mockResponse(orderId);
      }
      const data = await res.json();
      return new Response(
        JSON.stringify({
          ref: orderId,
          status: "pending",
          token: data.token,
          redirect_url: data.redirect_url,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Xendit ----
    if (provider === "xendit") {
      const apiKey = settings?.xendit?.apiKey;
      if (!apiKey) return mockResponse(orderId);
      const auth = btoa(`${apiKey}:`);
      const res = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          external_id: orderId,
          amount,
          description,
          customer: { given_names: customerName, mobile_number: customerPhone },
          payment_methods: [method.toUpperCase()],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[xendit] error:", text);
        return mockResponse(orderId);
      }
      const data = await res.json();
      return new Response(
        JSON.stringify({
          ref: orderId,
          status: "pending",
          redirect_url: data.invoice_url,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Mock ----
    return mockResponse(orderId);
  } catch (err) {
    console.error("[create-payment] unexpected:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mockResponse(orderId: string) {
  return new Response(
    JSON.stringify({ ref: orderId, status: "settled", mock: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
