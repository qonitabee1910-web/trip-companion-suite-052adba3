/**
 * Payment provider webhook receiver — skeleton.
 * Real activation: validate signature, then update shuttle_bookings.payment_status.
 *
 * verify_jwt = false (called by external providers)
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = await req.text();
    console.log("[payment-webhook] received:", body.slice(0, 500));
    // TODO: verify signature header (Midtrans: x-callback-token / Xendit: x-callback-token)
    // TODO: parse, then upsert booking payment_status by payment_ref
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[payment-webhook] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
