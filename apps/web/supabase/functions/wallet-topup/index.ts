/**
 * wallet-topup — create a Stripe Checkout session to top up the OmniTrip Wallet.
 * On success, the stripe-webhook function will credit the wallet balance.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const STRIPE_SECRET    = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
    const { userId, amount, currency = "USD", successUrl, cancelUrl } = await req.json() as {
      userId: string;
      amount: number;
      currency?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    if (!userId || !amount || !STRIPE_SECRET) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") ?? "http://localhost:5173";

    const session = await stripePost("/checkout/sessions", {
      "mode":                          "payment",
      "payment_method_types[]":        "card",
      "success_url":                   successUrl ?? `${origin}/plan?wallet=topped_up`,
      "cancel_url":                    cancelUrl  ?? `${origin}/plan?wallet=cancelled`,
      "line_items[0][price_data][currency]":                   currency.toLowerCase(),
      "line_items[0][price_data][product_data][name]":         "OmniTrip Wallet Top-up",
      "line_items[0][price_data][product_data][description]":  `Add $${amount} to your OmniTrip Wallet`,
      "line_items[0][price_data][unit_amount]":                String(amountCents),
      "line_items[0][quantity]":                               "1",
      "metadata[type]":                "wallet_topup",
      "metadata[user_id]":             userId,
      "metadata[amount]":              String(amount),
      "metadata[currency]":            currency.toUpperCase(),
    }) as { id: string; url: string };

    // Ensure wallet row exists
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    await supabase
      .from("user_wallets")
      .upsert({ user_id: userId, currency: currency.toUpperCase() }, { onConflict: "user_id", ignoreDuplicates: true });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("wallet-topup error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
