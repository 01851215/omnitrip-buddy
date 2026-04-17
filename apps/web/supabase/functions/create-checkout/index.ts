import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, priceAmount, currency, tripId, userId, dealCategory, provider, startTime, endTime, successUrl, cancelUrl } = await req.json();

    if (!title || !priceAmount || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(priceAmount * 100);

    // Create Stripe Checkout Session
    const session = await stripePost("/checkout/sessions", {
      "mode": "payment",
      "success_url": successUrl || `${req.headers.get("origin") ?? "http://localhost:5173"}/calendar?booking=success`,
      "cancel_url": cancelUrl || `${req.headers.get("origin") ?? "http://localhost:5173"}/plan?booking=cancelled`,
      "line_items[0][price_data][currency]": (currency || "USD").toLowerCase(),
      "line_items[0][price_data][product_data][name]": title,
      "line_items[0][price_data][product_data][description]": `Booked via OmniTrip · ${provider || "OmniTrip"}`,
      "line_items[0][price_data][unit_amount]": String(amountCents),
      "line_items[0][quantity]": "1",
      "metadata[trip_id]": tripId || "",
      "metadata[user_id]": userId,
      "metadata[deal_category]": dealCategory || "activities",
      "metadata[provider]": provider || "OmniTrip",
      "metadata[start_time]": startTime || "",
      "metadata[end_time]": endTime || "",
    }) as { id: string; url: string };

    // Insert pending booking into Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("bookings").insert({
      user_id: userId,
      trip_id: tripId || null,
      deal_category: dealCategory || "activities",
      provider: provider || "OmniTrip",
      title,
      price_amount: priceAmount,
      currency: (currency || "USD").toUpperCase(),
      status: "pending",
      stripe_session_id: session.id,
      start_time: startTime || null,
      end_time: endTime || null,
      metadata: { stripe_checkout_url: session.url },
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
