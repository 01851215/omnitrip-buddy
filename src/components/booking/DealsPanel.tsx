import { useState } from "react";
import type { Deal, DealCategory } from "../../services/deals";
import type { LiveDeal, LiveDealResult } from "../../services/searchApi";
import { DealCard } from "./DealCard";
import type { Booking } from "../../types";

interface DealsPanelProps {
  deals: Record<DealCategory, Deal[]> | LiveDealResult;
  destinationNames: string[];
  isLive?: boolean;
  loading?: boolean;
  tripId?: string;
  userId?: string;
  bookings?: Booking[];
}

const TABS: { key: DealCategory; label: string; emoji: string }[] = [
  { key: "flights", label: "Flights", emoji: "✈️" },
  { key: "hotels", label: "Hotels", emoji: "🏨" },
  { key: "trains", label: "Trains", emoji: "🚄" },
  { key: "activities", label: "Activities", emoji: "🎭" },
  { key: "dining", label: "Dining", emoji: "🍽" },
];

const PROVIDER_LOGOS: Record<DealCategory, string> = {
  flights: "Skyscanner · Google Flights · BudgetAir · Opodo",
  hotels: "Booking.com · Airbnb · Hotels.com · Hostelworld",
  trains: "Trainline · Rail Europe",
  activities: "Viator · GetYourGuide · Klook",
  dining: "OpenTable · TheFork · Tripadvisor",
};

export function DealsPanel({ deals, destinationNames, isLive, loading, tripId, userId, bookings }: DealsPanelProps) {
  const [activeTab, setActiveTab] = useState<DealCategory>("flights");
  const activeDeal = deals[activeTab] ?? [];

  const findBookingForDeal = (deal: Deal | LiveDeal): Booking | undefined => {
    if (!bookings?.length) return undefined;
    return bookings.find(
      (b) => b.title === deal.title && b.dealCategory === deal.category,
    );
  };

  return (
    <div className="mt-4 -mx-4">
      {/* Header */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🛒</span>
          <div>
            <p className="text-sm font-bold text-text">Best Deals for Your Trip</p>
            <p className="text-[10px] text-text-muted">
              {destinationNames.join(" · ")} ·{" "}
              {loading
                ? "Searching live prices…"
                : isLive
                  ? "✅ Live prices from Amadeus"
                  : "Comparing best prices"}
            </p>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-64 h-52 bg-cream rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-1">
          {TABS.map((tab) => {
            const count = (deals[tab.key] ?? []).length;
            if (count === 0) return null;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-white"
                    : "bg-cream text-text-muted border border-cream-dark"
                }`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
                <span
                  className={`text-[9px] px-1 rounded-full font-bold ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-cream-dark text-text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Deal cards row */}
      {!loading && activeDeal.length > 0 ? (
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pt-3 pb-1">
          {activeDeal.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              tripId={tripId}
              userId={userId}
              booking={findBookingForDeal(deal)}
            />
          ))}
        </div>
      ) : !loading ? (
        <div className="px-4 py-6 text-center text-xs text-text-muted">
          No deals available for this category.
        </div>
      ) : null}

      {/* Provider attribution */}
      {!loading && (
        <div className="px-4 mt-2">
          <p className="text-[9px] text-text-muted text-center">
            Powered by {isLive ? "Amadeus API · " : ""}{PROVIDER_LOGOS[activeTab]} · Prices may vary
          </p>
        </div>
      )}
    </div>
  );
}
