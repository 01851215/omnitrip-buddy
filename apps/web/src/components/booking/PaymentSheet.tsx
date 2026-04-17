/**
 * PaymentSheet — bottom-sheet in-app payment UI.
 *
 * Tabs:
 *  1. "Card / Apple Pay / Google Pay" — Stripe Payment Element (embedded)
 *  2. "OmniTrip Wallet"               — pay from balance instantly
 *
 * Adds a 3% OmniTrip service fee on all payments.
 */
import { useState, useEffect, useCallback } from "react";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { supabase } from "../../services/supabase";
import type { Wallet } from "../../hooks/useWallet";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const SERVICE_FEE = 0.03;

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise && STRIPE_KEY) stripePromise = loadStripe(STRIPE_KEY);
  return stripePromise;
}

export interface PaymentSheetProps {
  userId: string;
  tripId?: string;
  title: string;
  priceAmount: number;
  currency?: string;
  dealCategory: string;
  provider: string;
  startTime?: string;
  endTime?: string;
  wallet?: Wallet | null;
  onClose: () => void;
  onSuccess: (bookingId?: string) => void;
}

type Tab = "card" | "wallet";
type CardStep = "idle" | "loading" | "ready" | "processing" | "success" | "error";

export function PaymentSheet({
  userId,
  tripId,
  title,
  priceAmount,
  currency = "USD",
  dealCategory,
  provider,
  startTime,
  endTime,
  wallet,
  onClose,
  onSuccess,
}: PaymentSheetProps) {
  const fee         = Math.round(priceAmount * SERVICE_FEE * 100) / 100;
  const total       = Math.round((priceAmount + fee) * 100) / 100;
  const hasBalance  = (wallet?.balance ?? 0) >= total;

  const [tab, setTab]             = useState<Tab>(hasBalance ? "wallet" : "card");
  const [cardStep, setCardStep]   = useState<CardStep>("idle");
  const [errorMsg, setErrorMsg]   = useState("");
  const [bookingId, setBookingId] = useState<string | undefined>();

  // Stripe state
  const [stripe,   setStripe]   = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [mountEl,  setMountEl]  = useState(false);

  // ── Load Stripe & create PaymentIntent when card tab is active ────────────
  const initStripe = useCallback(async () => {
    if (cardStep !== "idle") return;
    setCardStep("loading");
    try {
      const s = await getStripe();
      if (!s) { setErrorMsg("Stripe not configured"); setCardStep("error"); return; }
      setStripe(s);

      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: { userId, tripId, title, priceAmount, currency, dealCategory, provider, startTime, endTime },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);

      const els = s.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary:     "#2D6A5A",
            colorBackground:  "#FDFAF7",
            colorText:        "#1A2E25",
            borderRadius:     "12px",
            fontFamily:       "system-ui, sans-serif",
          },
        },
      });

      const pe = els.create("payment", { layout: "tabs" });
      setElements(els);
      // Signal to mount
      setMountEl(true);
      setCardStep("ready");

      // Store pe on els so we can confirm later
      (els as any).__paymentElement = pe;
      setBookingId(data.bookingId);
    } catch (e: any) {
      setErrorMsg(e.message);
      setCardStep("error");
    }
  }, [cardStep, userId, tripId, title, priceAmount, currency, dealCategory, provider, startTime, endTime]);

  useEffect(() => {
    if (tab === "card" && cardStep === "idle") {
      initStripe();
    }
  }, [tab, cardStep, initStripe]);

  // Mount Payment Element into the DOM
  useEffect(() => {
    if (!mountEl || !elements) return;
    const pe = (elements as any).__paymentElement;
    if (!pe) return;
    const el = document.getElementById("omnitrip-payment-element");
    if (!el || el.childElementCount > 0) return;
    pe.mount(el);
    return () => pe.unmount();
  }, [mountEl, elements]);

  const handleCardPay = async () => {
    if (!stripe || !elements || cardStep !== "ready") return;
    setCardStep("processing");
    setErrorMsg("");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/plan?booking=success`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setErrorMsg(result.error.message ?? "Payment failed");
      setCardStep("error");
    } else {
      setCardStep("success");
      onSuccess(bookingId);
    }
  };

  const handleWalletPay = async () => {
    setCardStep("processing");
    setErrorMsg("");
    const { data, error } = await supabase.functions.invoke("wallet-spend", {
      body: { userId, tripId, title, priceAmount, currency, dealCategory, provider, startTime, endTime },
    });
    if (error || data?.error) {
      const msg = data?.error === "insufficient_funds"
        ? `Insufficient balance — need $${total.toFixed(2)}, have $${wallet?.balance?.toFixed(2) ?? "0"}`
        : (data?.error ?? error?.message ?? "Payment failed");
      setErrorMsg(msg);
      setCardStep("error");
    } else {
      setCardStep("success");
      onSuccess(data.bookingId);
    }
  };

  const isSuccess = cardStep === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="w-full max-w-md bg-surface rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom overflow-hidden"
      >

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-cream-dark rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-cream-dark">
          <h2 className="text-base font-bold font-serif">
            {isSuccess ? "🎉 Booking Confirmed!" : "Checkout"}
          </h2>
          <button onClick={onClose} className="text-text-muted text-lg leading-none" aria-label="Close">✕</button>
        </div>

        {/* Order summary */}
        <div className="mx-5 mt-4 bg-cream rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-text leading-snug">{title}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{provider}</p>
            </div>
            <p className="text-sm font-bold text-text">${priceAmount.toFixed(2)}</p>
          </div>
          <div className="border-t border-cream-dark pt-1.5 space-y-1">
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>OmniTrip service fee (3%)</span>
              <span>+${fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-text">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)} {currency}</span>
            </div>
          </div>
        </div>

        {/* ── Success state ── */}
        {isSuccess && (
          <div className="px-5 py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto text-2xl">
              ✅
            </div>
            <p className="text-sm font-semibold text-text">
              {tab === "wallet" ? "Paid with OmniTrip Wallet" : "Payment Successful"}
            </p>
            <p className="text-[10px] text-text-muted">Your booking is confirmed and added to your calendar.</p>
            <button
              onClick={onClose}
              className="w-full text-xs font-semibold text-white bg-primary py-3 rounded-xl"
            >
              Done
            </button>
          </div>
        )}

        {/* ── Payment form ── */}
        {!isSuccess && (
          <div className="px-5 pb-6 pt-4 space-y-4">
            {/* Tab switcher */}
            <div className="flex bg-cream rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => { setTab("card"); setErrorMsg(""); }}
                className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  tab === "card"
                    ? "bg-surface shadow-sm text-text font-semibold"
                    : "text-text-muted"
                }`}
              >
                💳 Card / Apple Pay
              </button>
              <button
                type="button"
                onClick={() => { setTab("wallet"); setErrorMsg(""); }}
                className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  tab === "wallet"
                    ? "bg-surface shadow-sm text-text font-semibold"
                    : "text-text-muted"
                }`}
              >
                👛 OmniTrip Wallet
              </button>
            </div>

            {/* ── Card tab ── */}
            {tab === "card" && (
              <div className="space-y-3">
                {(cardStep === "loading") && (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-text-muted">Loading secure payment…</p>
                  </div>
                )}
                {(cardStep === "ready" || cardStep === "processing") && (
                  <>
                    {/* Stripe mounts here */}
                    <div id="omnitrip-payment-element" className="min-h-[180px]" />
                    <button
                      type="button"
                      onClick={handleCardPay}
                      disabled={cardStep === "processing"}
                      className="w-full text-sm font-semibold text-white bg-primary py-3.5 rounded-xl disabled:opacity-60"
                    >
                      {cardStep === "processing" ? "Processing…" : `Pay $${total.toFixed(2)}`}
                    </button>
                  </>
                )}
                {cardStep === "error" && (
                  <div className="space-y-2">
                    <p className="text-xs text-red-500 text-center">{errorMsg}</p>
                    <button
                      type="button"
                      onClick={() => { setCardStep("idle"); setErrorMsg(""); }}
                      className="w-full text-xs font-medium text-text-muted bg-cream border border-cream-dark py-2.5 rounded-xl"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Wallet tab ── */}
            {tab === "wallet" && (
              <div className="space-y-3">
                {/* Balance display */}
                <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Wallet Balance</p>
                    <p className="text-lg font-bold text-primary">
                      ${(wallet?.balance ?? 0).toFixed(2)}
                    </p>
                  </div>
                  {hasBalance
                    ? <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">✓ Sufficient</span>
                    : <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">Insufficient</span>
                  }
                </div>

                {!hasBalance && (
                  <p className="text-xs text-text-muted text-center">
                    You need ${(total - (wallet?.balance ?? 0)).toFixed(2)} more.{" "}
                    <span className="text-primary font-medium">Top up your wallet below.</span>
                  </p>
                )}

                {errorMsg && (
                  <p className="text-xs text-red-500 text-center">{errorMsg}</p>
                )}

                {hasBalance ? (
                  <button
                    type="button"
                    onClick={handleWalletPay}
                    disabled={cardStep === "processing"}
                    className="w-full text-sm font-semibold text-white bg-primary py-3.5 rounded-xl disabled:opacity-60"
                  >
                    {cardStep === "processing" ? "Processing…" : `Pay $${total.toFixed(2)} with Wallet`}
                  </button>
                ) : (
                  <TopUpButton userId={userId} amount={Math.ceil(total - (wallet?.balance ?? 0))} />
                )}
              </div>
            )}

            <p className="text-[9px] text-center text-text-muted">
              🔒 Secure payment · Powered by Stripe · OmniTrip service fee included
            </p>
          </div>
        )}

        <div className="h-safe-bottom" />
      </div>
    </div>
  );
}

// ── Quick top-up button ───────────────────────────────────────────────────────
function TopUpButton({ userId, amount }: { userId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [topUpError, setTopUpError] = useState("");

  const QUICK_AMOUNTS = [20, 50, 100, 200];

  const handleTopUp = async (topUpAmount: number) => {
    setLoading(true);
    setTopUpError("");
    const { data, error } = await supabase.functions.invoke("wallet-topup", {
      body: { userId, amount: topUpAmount, currency: "USD" },
    });
    if (!error && data?.url) {
      window.open(data.url, "_blank");
    } else {
      const msg = data?.error ?? error?.message ?? "unknown error";
      if (msg.includes("Missing") || msg.includes("Stripe")) {
        setTopUpError("Stripe isn't set up yet — ask the admin to add STRIPE_SECRET_KEY to Supabase secrets.");
      } else {
        setTopUpError(`Top-up failed: ${msg}`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-text text-center">Top up your wallet</p>
      <div className="grid grid-cols-4 gap-1.5">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => handleTopUp(a)}
            disabled={loading}
            className={`text-xs font-semibold py-2 rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
              a >= amount
                ? "bg-primary text-white border-primary"
                : "bg-cream border-cream-dark text-text-muted"
            }`}
          >
            ${a}
          </button>
        ))}
      </div>
      {topUpError
        ? <p className="text-[10px] text-amber-600 text-center leading-snug">{topUpError}</p>
        : <p className="text-[10px] text-text-muted text-center">Tap to add funds via Stripe · Opens new tab</p>
      }
    </div>
  );
}
