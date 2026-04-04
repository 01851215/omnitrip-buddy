import { useState } from "react";
import type { Deal } from "../../services/deals";
import type { LiveDeal } from "../../services/searchApi";
import { recordExternalBooking } from "../../services/searchApi";
import { CheckoutButton } from "./CheckoutButton";
import { BookingBadge } from "./BookingBadge";
import { FlightBookingModal } from "./FlightBookingModal";
import { PaymentSheet } from "./PaymentSheet";
import type { Booking } from "../../types";
import { supabase } from "../../services/supabase";
import type { Wallet } from "../../hooks/useWallet";

interface DealCardProps {
  deal: Deal | LiveDeal;
  tripId?: string;
  userId?: string;
  booking?: Booking;
  wallet?: Wallet | null;
  onBookingConfirmed?: () => void;
}

function isLiveDeal(d: Deal | LiveDeal): d is LiveDeal {
  return "provider" in d && "bookable" in d;
}

// Derive a sensible start/end datetime for calendar insertion
function dealToCalendarTimes(deal: Deal | LiveDeal): { startTime: string; endTime: string } | null {
  const d = deal as any;
  // Activities/dining: use dayDate + timeExact
  if ((deal.category === "activities" || deal.category === "dining") && d.dayDate && d.timeExact) {
    const [timePart, ampm] = d.timeExact.split(" ");
    const [hStr, mStr] = timePart.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const start = new Date(`${d.dayDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    const end = new Date(start.getTime() + (deal.category === "dining" ? 90 : 120) * 60000);
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  }
  // Hotels: full stay (checkIn morning → checkOut morning)
  if (deal.category === "hotels" && d.checkIn && d.checkOut) {
    return {
      startTime: `${d.checkIn}T14:00:00`,
      endTime: `${d.checkOut}T11:00:00`,
    };
  }
  // Flights: use actual departure/arrival times if available
  if (deal.category === "flights" && d.checkIn) {
    const dep = d.departureTime ?? "08:00";
    const arr = d.arrivalTime ?? "12:00";
    return {
      startTime: `${d.checkIn}T${dep}:00`,
      endTime: `${d.checkIn}T${arr}:00`,
    };
  }
  // Trains
  if (deal.category === "trains" && d.checkIn) {
    return {
      startTime: `${d.checkIn}T09:00:00`,
      endTime: `${d.checkIn}T12:00:00`,
    };
  }
  return null;
}

export function DealCard({ deal, tripId, userId, booking, wallet, onBookingConfirmed }: DealCardProps) {
  const [markedBooked, setMarkedBooked] = useState(false);
  const [calAdded, setCalAdded] = useState(false);
  const [calAdding, setCalAdding] = useState(false);
  const [showCalConfirm, setShowCalConfirm] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const live = isLiveDeal(deal);
  const affiliateLinks = live ? [] : (deal as Deal).affiliateLinks;
  const primaryUrl = live
    ? (deal as LiveDeal).affiliateUrl
    : affiliateLinks[0]?.url;

  const needsConfirm = deal.category === "flights" || deal.category === "hotels" || deal.category === "trains";

  const handleAddToCalendar = async () => {
    if (!userId) return;
    const times = dealToCalendarTimes(deal);
    if (!times) return;
    setCalAdding(true);
    await supabase.from("calendar_events").insert({
      user_id: userId,
      trip_id: tripId ?? null,
      source: "omnitrip",
      title: deal.title,
      description: deal.subtitle,
      start_time: times.startTime,
      end_time: times.endTime,
      type: "travel",
      conflicts_with: [],
    });
    setCalAdding(false);
    setCalAdded(true);
    setShowCalConfirm(false);
  };

  const handleMarkBooked = async () => {
    if (!userId) return;
    await recordExternalBooking({
      userId,
      tripId,
      dealCategory: deal.category as any,
      provider: live ? deal.provider : affiliateLinks[0]?.provider ?? "Unknown",
      title: deal.title,
      priceAmount: deal.priceFrom,
      currency: deal.currency,
      bookingUrl: primaryUrl,
    });
    setMarkedBooked(true);
  };

  const isBooked = !!booking || markedBooked;

  return (
    <div className="flex-shrink-0 w-64 bg-surface rounded-2xl overflow-hidden shadow-sm border border-cream-dark">
      {/* Image */}
      <div className="relative h-32">
        <img
          src={deal.image}
          alt={deal.title}
          className="w-full h-full object-cover"
        />
        {deal.badge && !isBooked && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full">
            {deal.badge}
          </span>
        )}
        {isBooked && (
          <span className="absolute top-2 left-2">
            <BookingBadge
              status={booking?.status ?? "external"}
              compact
            />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-xs font-semibold text-text line-clamp-1">{deal.title}</p>

        {/* Flight number + times row */}
        {deal.category === "flights" && (deal as any).flightNumber && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
              {(deal as any).flightNumber}
            </span>
            {(deal as any).departureTime && (deal as any).arrivalTime && (
              <span className="text-[10px] font-medium text-text">
                {(deal as any).departureTime} → {(deal as any).arrivalTime}
              </span>
            )}
            {(deal as any).durationMins && (
              <span className="text-[9px] text-text-muted">
                · {Math.floor((deal as any).durationMins / 60)}h {(deal as any).durationMins % 60}m
              </span>
            )}
          </div>
        )}

        <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{deal.subtitle}</p>

        {/* Hotel star rating + room type */}
        {deal.category === "hotels" && (
          <div className="mt-1 space-y-0.5">
            {(deal as any).starRating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: (deal as any).starRating as number }).map((_, i) => (
                  <span key={i} className="text-[9px] text-amber-400">★</span>
                ))}
              </div>
            )}
            {(deal as any).roomType && (
              <p className="text-[10px] text-text-muted">{(deal as any).roomType}</p>
            )}
            {(deal as any).amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {((deal as any).amenities as string[]).map((a) => (
                  <span key={a} className="text-[8px] bg-cream text-text-muted px-1 py-0.5 rounded border border-cream-dark">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Time pill for activities / dining */}
        {(deal.category === "activities" || deal.category === "dining") && (deal as any).timeExact && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px]">
              {(deal as any).timeSlot === "morning" ? "🌅" : (deal as any).timeSlot === "afternoon" ? "☀️" : "🌙"}
            </span>
            <span className="text-[10px] text-primary font-medium">{(deal as any).timeExact}</span>
          </div>
        )}

        {/* Check-in / check-out pill for hotels */}
        {deal.category === "hotels" && (deal as any).checkIn && (deal as any).checkOut && (
          <div className="flex items-center gap-1 mt-1.5 bg-primary/8 rounded-md px-2 py-1">
            <span className="text-[9px]">📅</span>
            <span className="text-[10px] text-primary font-medium">
              {new Date((deal as any).checkIn).toLocaleDateString("en", { month: "short", day: "numeric" })}
              {" → "}
              {new Date((deal as any).checkOut).toLocaleDateString("en", { month: "short", day: "numeric" })}
            </span>
          </div>
        )}

        {/* Rating */}
        {deal.rating && deal.category !== "hotels" && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] text-amber-500">★</span>
            <span className="text-[10px] font-medium text-text">{deal.rating.toFixed(1)}</span>
            {deal.reviewCount && (
              <span className="text-[10px] text-text-muted">
                ({deal.reviewCount.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Price + CTAs */}
        <div className="flex items-center justify-between mt-2.5">
          <div>
            <span className="text-[10px] text-text-muted">From </span>
            <span className="text-sm font-bold text-text">
              ${deal.priceFrom}
            </span>
          </div>

          {isBooked ? (
            <BookingBadge
              status={booking?.status ?? "external"}
              provider={live ? deal.provider : undefined}
            />
          ) : live && deal.category === "flights" && (deal as LiveDeal).amadeusOffer ? (
            /* In-app Amadeus booking */
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              className="text-[10px] font-semibold bg-primary text-white px-3 py-1.5 rounded-lg"
            >
              Book Now
            </button>
          ) : live && deal.bookable && userId && deal.category !== "flights" ? (
            <CheckoutButton
              title={deal.title}
              priceAmount={deal.priceFrom}
              currency={deal.currency}
              tripId={tripId}
              userId={userId}
              dealCategory={deal.category as any}
              provider={deal.provider}
            />
          ) : primaryUrl ? (
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold bg-primary text-white px-3 py-1.5 rounded-lg"
            >
              View Deal
            </a>
          ) : null}
        </div>

        {/* "Pay with OmniTrip" in-app checkout — for any bookable deal with a price */}
        {!isBooked && userId && deal.priceFrom > 0 && deal.category !== "flights" && (
          <button
            type="button"
            onClick={() => setShowPaymentSheet(true)}
            className="w-full mt-2 text-[10px] font-semibold text-white bg-gradient-to-r from-primary to-primary/85 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            🛒 Pay with OmniTrip
          </button>
        )}

        {/* "Mark as Booked" for non-bookable deals (only when not showing Pay button) */}
        {!isBooked && !(live && (deal as LiveDeal).bookable) && userId && deal.category === "flights" && (
          <button
            type="button"
            onClick={handleMarkBooked}
            className="w-full mt-2 text-[10px] font-medium text-text-muted bg-cream border border-cream-dark px-3 py-1.5 rounded-lg hover:bg-cream-dark transition-colors"
          >
            ✓ Mark as Booked
          </button>
        )}

        {/* Booking platform links */}
        <div className="flex flex-wrap gap-1 mt-2">
          {live ? (
            <a
              href={(deal as LiveDeal).affiliateUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
            >
              🔗 via {(deal as LiveDeal).provider}
            </a>
          ) : (
            affiliateLinks.map((link) => (
              <a
                key={link.provider}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${link.color} text-text-secondary border border-cream-dark`}
              >
                {link.logo} {link.provider}
              </a>
            ))
          )}
        </div>

        {/* Add to Calendar */}
        {userId && !calAdded && (
          <>
            {showCalConfirm ? (
              /* Confirm/reject row for flights, hotels, trains */
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCalConfirm(false)}
                  className="flex-1 text-[10px] font-medium text-text-muted bg-cream border border-cream-dark px-2 py-1.5 rounded-lg"
                >
                  ✕ Reject
                </button>
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  disabled={calAdding}
                  className="flex-1 text-[10px] font-medium text-white bg-primary px-2 py-1.5 rounded-lg disabled:opacity-60"
                >
                  {calAdding ? "Adding…" : "✓ Confirm"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => needsConfirm ? setShowCalConfirm(true) : handleAddToCalendar()}
                disabled={calAdding}
                className="w-full mt-2 text-[10px] font-medium text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/15 transition-colors disabled:opacity-60"
              >
                📅 Add to Calendar
              </button>
            )}
          </>
        )}
        {calAdded && (
          <p className="mt-2 text-[10px] text-center text-primary font-medium">✓ Added to calendar</p>
        )}
      </div>

      {/* In-app flight booking modal */}
      {showBookingModal && live && (
        <FlightBookingModal
          deal={deal as LiveDeal}
          userId={userId}
          tripId={tripId}
          onClose={() => setShowBookingModal(false)}
        />
      )}

      {/* In-app OmniTrip payment sheet */}
      {showPaymentSheet && userId && (
        <PaymentSheet
          userId={userId}
          tripId={tripId}
          title={deal.title}
          priceAmount={deal.priceFrom}
          currency={deal.currency}
          dealCategory={deal.category}
          provider={live ? (deal as LiveDeal).provider : (deal as Deal).affiliateLinks?.[0]?.provider ?? "OmniTrip"}
          wallet={wallet}
          onClose={() => setShowPaymentSheet(false)}
          onSuccess={() => {
            setShowPaymentSheet(false);
            setMarkedBooked(true);
            onBookingConfirmed?.();
          }}
        />
      )}
    </div>
  );
}
