/**
 * wallet-spend — deduct wallet balance to pay for a booking.
 * Atomically checks sufficient funds, deducts, creates booking + transaction records.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SERVICE_FEE_PCT = 0.03;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    if (!userId || !title || !priceAmount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fee   = Math.round(priceAmount * SERVICE_FEE_PCT * 100) / 100;
    const total = Math.round((priceAmount + fee) * 100) / 100;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Get wallet (service-role bypasses RLS for atomic transaction)
    const { data: wallet, error: walletErr } = await supabase
      .from("user_wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .single();

    if (walletErr || !wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wallet.balance < total) {
      return new Response(JSON.stringify({
        error: "insufficient_funds",
        balance: wallet.balance,
        required: total,
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct balance
    const { error: updateErr } = await supabase
      .from("user_wallets")
      .update({ balance: wallet.balance - total })
      .eq("id", wallet.id);

    if (updateErr) throw updateErr;

    // Create confirmed booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        user_id:       userId,
        trip_id:       tripId ?? null,
        deal_category: dealCategory,
        provider,
        title,
        price_amount:  priceAmount,
        currency:      currency.toUpperCase(),
        status:        "confirmed",
        start_time:    startTime ?? null,
        end_time:      endTime ?? null,
        metadata:      { paid_with: "wallet", service_fee: fee },
      })
      .select("id")
      .single();

    if (bookingErr) throw bookingErr;

    // Record wallet transaction
    await supabase.from("wallet_transactions").insert({
      user_id:     userId,
      type:        "spend",
      amount:      total,
      currency:    currency.toUpperCase(),
      description: `Booking: ${title}`,
      booking_id:  booking.id,
    });

    return new Response(JSON.stringify({
      success:      true,
      bookingId:    booking.id,
      amountPaid:   total,
      serviceFee:   fee,
      newBalance:   Math.round((wallet.balance - total) * 100) / 100,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("wallet-spend error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
