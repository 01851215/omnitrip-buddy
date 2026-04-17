import { useState } from "react";
import { supabase } from "../../services/supabase";
import type { LiveDeal } from "../../services/searchApi";

interface FlightBookingModalProps {
  deal: LiveDeal;
  onClose: () => void;
  userId?: string;
  tripId?: string;
}

type Step = "confirm" | "details" | "success" | "error";

export function FlightBookingModal({ deal, onClose, userId, tripId }: FlightBookingModalProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [loading, setLoading] = useState(false);
  const [pnr, setPnr] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "MALE" as "MALE" | "FEMALE",
  });

  const d = deal as any;

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const isFormValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.includes("@") &&
    form.phone.replace(/\D/g, "").length >= 7 &&
    form.dateOfBirth;

  async function handleBook() {
    if (!isFormValid) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("book-flight", {
        body: {
          offer: d.amadeusOffer ?? null,
          traveler: { ...form },
        },
      });

      if (error) throw error;

      if (data?.success) {
        setPnr(data.pnr ?? "CONFIRMED");
        // Save booking record
        if (userId) {
          await supabase.from("bookings").insert({
            user_id: userId,
            trip_id: tripId ?? null,
            category: "flights",
            provider: deal.provider,
            title: deal.title,
            price_amount: deal.priceFrom,
            currency: deal.currency,
            booking_reference: data.pnr,
            status: "confirmed",
          }).select().single();
        }
        setStep("success");
      } else {
        throw new Error(data?.error ?? "Booking failed");
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Something went wrong. Please try again.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="w-full max-w-md bg-surface rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-cream-dark">
          <h2 className="text-base font-bold font-serif">
            {step === "confirm" && "Confirm Flight"}
            {step === "details" && "Traveler Details"}
            {step === "success" && "🎉 Booking Confirmed"}
            {step === "error" && "Booking Failed"}
          </h2>
          <button onClick={onClose} className="text-text-muted text-lg leading-none" aria-label="Close">✕</button>
        </div>

        {/* Flight Summary (always visible) */}
        <div className="mx-5 mt-4 bg-cream rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-text">{deal.title}</p>
            {d.flightNumber && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {d.flightNumber}
                </span>
                {d.departureTime && d.arrivalTime && (
                  <span className="text-[10px] text-text-muted">
                    {d.departureTime} → {d.arrivalTime}
                  </span>
                )}
              </div>
            )}
            <p className="text-[10px] text-text-muted mt-0.5">{deal.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Total</p>
            <p className="text-lg font-bold text-primary">${deal.priceFrom}</p>
          </div>
        </div>

        {/* ── Step: Confirm ────────────────────────────────────────────────── */}
        {step === "confirm" && (
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs text-text-muted leading-relaxed">
              This will create a real booking via Amadeus. You'll receive a PNR (booking reference) instantly.
              {!d.amadeusOffer && " (Demo mode: no live offer — a sample PNR will be generated.)"}
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 text-xs font-medium text-text-muted bg-cream border border-cream-dark py-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50">
                Cancel
              </button>
              <button
                onClick={() => setStep("details")}
                className="flex-1 text-xs font-semibold text-white bg-primary py-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Traveler Details ───────────────────────────────────────── */}
        {step === "details" && (
          <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="booking-first-name" className="text-[10px] text-text-muted font-medium uppercase tracking-wide">First Name</label>
                <input
                  id="booking-first-name"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  placeholder="John"
                  autoComplete="given-name"
                  className="w-full mt-1 text-xs bg-cream border border-cream-dark rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="booking-last-name" className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Last Name</label>
                <input
                  id="booking-last-name"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Smith"
                  autoComplete="family-name"
                  className="w-full mt-1 text-xs bg-cream border border-cream-dark rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="booking-email" className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Email</label>
              <input
                id="booking-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="john@example.com"
                autoComplete="email"
                className="w-full mt-1 text-xs bg-cream border border-cream-dark rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="booking-phone" className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Phone</label>
              <input
                id="booking-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 555 123 4567"
                autoComplete="tel"
                className="w-full mt-1 text-xs bg-cream border border-cream-dark rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="booking-dob" className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Date of Birth</label>
                <input
                  id="booking-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  autoComplete="bday"
                  className="w-full mt-1 text-xs bg-cream border border-cream-dark rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="booking-gender" className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Gender</label>
                <select
                  id="booking-gender"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  className="w-full mt-1 text-xs bg-cream border border-cream-dark rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep("confirm")} className="flex-1 text-xs font-medium text-text-muted bg-cream border border-cream-dark py-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50">
                ← Back
              </button>
              <button
                type="button"
                onClick={handleBook}
                disabled={!isFormValid || loading}
                className="flex-1 text-xs font-semibold text-white bg-primary py-2.5 rounded-xl disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {loading ? "Booking…" : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Success ────────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="px-5 py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto text-2xl">✈️</div>
            <div>
              <p className="text-sm font-semibold text-text">Booking Reference</p>
              <p className="text-3xl font-bold font-mono text-primary mt-1">{pnr}</p>
              <p className="text-[10px] text-text-muted mt-1">Save this PNR — you'll need it at check-in</p>
            </div>
            <div className="bg-cream rounded-xl p-3 text-left space-y-1">
              <p className="text-[10px] text-text-muted">✓ Confirmation sent to <strong>{form.email}</strong></p>
              <p className="text-[10px] text-text-muted">✓ Saved to your trip</p>
            </div>
            <button type="button" onClick={onClose} className="w-full text-xs font-semibold text-white bg-primary py-3 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50">
              Done
            </button>
          </div>
        )}

        {/* ── Step: Error ──────────────────────────────────────────────────── */}
        {step === "error" && (
          <div className="px-5 py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto text-2xl">⚠️</div>
            <div>
              <p className="text-sm font-semibold text-text">Booking Unavailable</p>
              <p className="text-[10px] text-text-muted mt-1">{errorMsg}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("details")} className="flex-1 text-xs font-medium text-text-muted bg-cream border border-cream-dark py-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50">
                Try Again
              </button>
              <a
                href={deal.affiliateUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs font-semibold text-white bg-primary py-2.5 rounded-xl text-center"
                onClick={onClose}
              >
                Google Flights →
              </a>
            </div>
          </div>
        )}

        <div className="h-safe-bottom" />
      </div>
    </div>
  );
}
