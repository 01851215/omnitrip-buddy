import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const STRIPE_SECRET    = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SERVICE_FEE_PCT = 0.03; // 3%

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function stripePost(path: string, body: Record<string, string>): Promise<unknown> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(STRIPE_SECRET + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      userId,
      tripId,
      title,
      priceAmount,
      currency = "USD",
      dealCategory,
      provider,
      startTime,
      endTime,
    } = await req.json() as {
      userId: string;
      tripId?: string;
      title: string;
      priceAmount: number;
      currency?: string;
      dealCategory: string;
      provider: string;
      startTime?: string;
      endTime?: string;
    };

    if (!userId || !title || !priceAmount || !STRIPE_SECRET) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseCents   = Math.round(priceAmount * 100);
    const feeCents    = Math.round(baseCents * SERVICE_FEE_PCT);
    const totalCents  = baseCents + feeCents;

    // Create PaymentIntent with automatic payment methods (card + Apple/Google Pay)
    const intent = await stripePost("/payment_intents", {
      amount:               String(totalCents),
      currency:             currency.toLowerCase(),
      automatic_payment_methods: JSON.stringify({ enabled: true }),
      description:          `OmniTrip: ${title}`,
      "metadata[user_id]":  userId,
      "metadata[trip_id]":  tripId ?? "",
      "metadata[category]": dealCategory,
      "metadata[provider]": provider,
      "metadata[base_amount]":    String(priceAmount),
      "metadata[service_fee]":    String(Math.round(feeCents) / 100),
      "metadata[start_time]":     startTime ?? "",
      "metadata[end_time]":       endTime ?? "",
    }) as { id: string; client_secret: string };

    // Pre-create a pending booking record
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: booking } = await supabase.from("bookings").insert({
      user_id:           userId,
      trip_id:           tripId ?? null,
      deal_category:     dealCategory,
      provider,
      title,
      price_amount:      priceAmount,
      currency:          currency.toUpperCase(),
      status:            "pending",
      stripe_session_id: intent.id,
      start_time:        startTime ?? null,
      end_time:          endTime ?? null,
    }).select("id").single();

    return new Response(JSON.stringify({
      clientSecret:  intent.client_secret,
      paymentIntentId: intent.id,
      bookingId:     booking?.id ?? null,
      baseAmount:    priceAmount,
      serviceFee:    Math.round(feeCents) / 100,
      totalAmount:   totalCents / 100,
      currency:      currency.toUpperCase(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("create-payment-intent error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
