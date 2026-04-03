import { useState } from "react";
import type { Deal } from "../../services/deals";
import type { LiveDeal } from "../../services/searchApi";
import { recordExternalBooking } from "../../services/searchApi";
import { CheckoutButton } from "./CheckoutButton";
import { BookingBadge } from "./BookingBadge";
import type { Booking } from "../../types";

interface DealCardProps {
  deal: Deal | LiveDeal;
  tripId?: string;
  userId?: string;
  booking?: Booking;
}

function isLiveDeal(d: Deal | LiveDeal): d is LiveDeal {
  return "provider" in d && "bookable" in d;
}

export function DealCard({ deal, tripId, userId, booking }: DealCardProps) {
  const [markedBooked, setMarkedBooked] = useState(false);

  const live = isLiveDeal(deal);
  const affiliateLinks = live ? [] : (deal as Deal).affiliateLinks;
  const primaryUrl = live
    ? (deal as LiveDeal).affiliateUrl
    : affiliateLinks[0]?.url;

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
        <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{deal.subtitle}</p>

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
        {deal.rating && (
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
          ) : live && deal.bookable && userId ? (
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

        {/* "Mark as Booked" for non-bookable deals */}
        {!isBooked && !(live && (deal as LiveDeal).bookable) && userId && (
          <button
            type="button"
            onClick={handleMarkBooked}
            className="w-full mt-2 text-[10px] font-medium text-text-muted bg-cream border border-cream-dark px-3 py-1.5 rounded-lg hover:bg-cream-dark transition-colors"
          >
            ✓ Mark as Booked
          </button>
        )}

        {/* Provider pills (legacy affiliate links) */}
        {!live && affiliateLinks.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {affiliateLinks.map((link) => (
              <a
                key={link.provider}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${link.color} text-text-secondary border border-cream-dark`}
              >
                {link.logo} {link.provider}
              </a>
            ))}
          </div>
        )}

        {/* Live provider label */}
        {live && (
          <div className="mt-2">
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-cream text-text-secondary border border-cream-dark">
              via {deal.provider}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
