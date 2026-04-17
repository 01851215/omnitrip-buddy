import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const encoder = new TextEncoder();

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!secret) return true; // skip verification in dev if no secret configured

  const parts = signature.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === sig;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const valid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Handle wallet top-up sessions ───────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const meta    = session.metadata ?? {};

    if (meta.type === "wallet_topup" && meta.user_id) {
      const amount   = parseFloat(meta.amount ?? "0");
      const currency = meta.currency ?? "USD";

      // Credit wallet
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("id, balance")
        .eq("user_id", meta.user_id)
        .single();

      if (wallet) {
        await supabase
          .from("user_wallets")
          .update({ balance: wallet.balance + amount })
          .eq("id", wallet.id);
      } else {
        await supabase.from("user_wallets").insert({
          user_id:  meta.user_id,
          balance:  amount,
          currency,
        });
      }

      // Record transaction
      await supabase.from("wallet_transactions").insert({
        user_id:           meta.user_id,
        type:              "topup",
        amount,
        currency,
        description:       "Wallet top-up via Stripe",
        stripe_session_id: session.id,
      });

      return new Response(JSON.stringify({ received: true, type: "wallet_topup" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Handle regular booking checkout sessions ─────────────────────────────
    const sessionId       = session.id;
    const paymentIntentId = session.payment_intent;

    const { data: bookings } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        stripe_payment_intent_id: paymentIntentId,
        booking_url: session.url ?? null,
      })
      .eq("stripe_session_id", sessionId)
      .select("*");

    const booking = bookings?.[0];

    if (booking && meta.user_id) {
      await supabase.from("calendar_events").insert({
        user_id:     meta.user_id,
        trip_id:     meta.trip_id || null,
        source:      "omnitrip",
        title:       `✅ ${booking.title}`,
        description: `Booked via OmniTrip · ${booking.provider} · $${booking.price_amount} ${booking.currency}`,
        start_time:  booking.start_time || new Date().toISOString(),
        end_time:    booking.end_time   || new Date(Date.now() + 3600000).toISOString(),
        type:        booking.deal_category === "hotels" ? "travel" : "personal",
        conflicts_with: [],
        booking_id:  booking.id,
      });
    }

    return new Response(JSON.stringify({ received: true, bookingId: booking?.id }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Handle PaymentIntent succeeded (in-app payment) ─────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const pi   = event.data.object;
    const meta = pi.metadata ?? {};

    if (meta.user_id) {
      // Update any pending booking matching this payment_intent id
      await supabase
        .from("bookings")
        .update({ status: "confirmed", stripe_payment_intent_id: pi.id })
        .eq("stripe_session_id", pi.id);
    }

    return new Response(JSON.stringify({ received: true, type: "payment_intent.succeeded" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
