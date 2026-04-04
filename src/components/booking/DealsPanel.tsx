import { useState } from "react";
import type { Deal, DealCategory } from "../../services/deals";
import type { LiveDeal, LiveDealResult } from "../../services/searchApi";
import { DealCard } from "./DealCard";
import type { Booking } from "../../types";
import type { Wallet } from "../../hooks/useWallet";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

interface DealsPanelProps {
  deals: Record<DealCategory, Deal[]> | LiveDealResult;
  destinationNames: string[];
  isLive?: boolean;
  loading?: boolean;
  tripId?: string;
  userId?: string;
  bookings?: Booking[];
  dailyBudget?: number | null;
  intensity?: "relaxed" | "balanced" | "packed" | null;
  wallet?: Wallet | null;
  onBookingConfirmed?: () => void;
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

const INTENSITY_PER_DAY: Record<string, number> = { relaxed: 2, balanced: 4, packed: 6 };
const TIME_SLOT_LABEL: Record<string, string> = { morning: "🌅 Morning", afternoon: "☀️ Afternoon", evening: "🌙 Evening" };

export function DealsPanel({ deals, destinationNames, isLive, loading, tripId, userId, bookings, dailyBudget, intensity, wallet, onBookingConfirmed }: DealsPanelProps) {
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

      {/* Deal cards */}
      {!loading && activeDeal.length > 0 ? (
        activeTab === "hotels" ? (
          /* ── Hotels: vertical destination timeline ── */
          <div className="px-4 pt-3 pb-1 space-y-5">
            {(() => {
              // Group by destination, preserving insertion order
              const grouped: Record<string, (Deal | LiveDeal)[]> = {};
              for (const deal of activeDeal) {
                const dest = (deal as Deal).destination ?? (deal as LiveDeal).destination ?? "Other";
                grouped[dest] = [...(grouped[dest] ?? []), deal];
              }
              const entries = Object.entries(grouped);
              return entries.map(([dest, cards], i) => {
                const checkIn = (cards[0] as any).checkIn as string | undefined;
                const checkOut = (cards[0] as any).checkOut as string | undefined;
                const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : null;
                return (
                  <div key={dest} className="relative pl-6">
                    {/* Vertical connector line */}
                    {i < entries.length - 1 && (
                      <div className="absolute left-[9px] top-6 bottom-[-12px] w-0.5 bg-primary/20" />
                    )}
                    {/* Section header */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="absolute left-0 w-[18px] h-[18px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold text-text">{dest}</span>
                      {checkIn && checkOut && (
                        <span className="text-[10px] text-text-muted">
                          {formatDate(checkIn)} – {formatDate(checkOut)}
                        </span>
                      )}
                      {nights !== null && (
                        <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          {nights} night{nights !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {/* Hotel cards horizontal scroll */}
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                      {cards.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          tripId={tripId}
                          userId={userId}
                          booking={findBookingForDeal(deal)}
                          wallet={wallet}
                          onBookingConfirmed={onBookingConfirmed}
                        />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (activeTab === "activities" || activeTab === "dining") ? (
          /* ── Activities / Dining: destination → day → time timeline ── */
          (() => {
            const perDay = intensity ? (INTENSITY_PER_DAY[intensity] ?? 4) : 4;
            // Budget per item = daily budget ÷ activities per day (rough slice)
            const budgetPerItem = dailyBudget ? dailyBudget / perDay : null;

            // Group by destination
            const byDest: Record<string, (Deal | LiveDeal)[]> = {};
            for (const deal of activeDeal) {
              const dest = (deal as any).destination ?? "Other";
              // Filter by budget
              if (budgetPerItem && deal.priceFrom > budgetPerItem * 1.5) continue;
              byDest[dest] = [...(byDest[dest] ?? []), deal];
            }
            const destEntries = Object.entries(byDest);
            return (
              <div className="px-4 pt-3 pb-1 space-y-6">
                {destEntries.map(([dest, destDeals], di) => {
                  const checkIn = (destDeals[0] as any).checkIn as string | undefined;
                  const checkOut = (destDeals[0] as any).checkOut as string | undefined;
                  const numDays = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : null;

                  // Group by day
                  const byDay: Record<number, (Deal | LiveDeal)[]> = {};
                  for (const deal of destDeals) {
                    const d = (deal as any).day ?? 1;
                    byDay[d] = [...(byDay[d] ?? []), deal];
                  }
                  // Limit per day by intensity
                  const dayEntries = Object.entries(byDay)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([dayNum, dayDeals]) => [dayNum, dayDeals.slice(0, perDay)] as [string, (Deal | LiveDeal)[]]);

                  return (
                    <div key={dest} className="relative pl-6">
                      {di < destEntries.length - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-[-16px] w-0.5 bg-primary/20" />
                      )}
                      {/* Destination header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="absolute left-0 w-[18px] h-[18px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                          {di + 1}
                        </span>
                        <span className="text-xs font-semibold text-text">{dest}</span>
                        {checkIn && checkOut && (
                          <span className="text-[10px] text-text-muted">
                            {formatDate(checkIn)} – {formatDate(checkOut)}
                          </span>
                        )}
                        {numDays !== null && (
                          <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            {numDays} day{numDays !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Day sections */}
                      <div className="space-y-3">
                        {dayEntries.map(([dayNum, dayDeals]) => {
                          const dayDate = (dayDeals[0] as any).dayDate as string | undefined;
                          return (
                            <div key={dayNum}>
                              {/* Day header */}
                              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                                Day {dayNum}{dayDate ? ` — ${formatDate(dayDate)}` : ""}
                              </p>
                              {/* Cards grouped by time slot */}
                              {(["morning", "afternoon", "evening"] as const).map((slot) => {
                                const slotDeals = dayDeals.filter((d) => (d as any).timeSlot === slot);
                                if (slotDeals.length === 0) return null;
                                return (
                                  <div key={slot} className="mb-2">
                                    <p className="text-[10px] text-text-muted mb-1.5">{TIME_SLOT_LABEL[slot]}</p>
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                      {slotDeals.map((deal) => (
                                        <DealCard
                                          key={deal.id}
                                          deal={deal}
                                          tripId={tripId}
                                          userId={userId}
                                          booking={findBookingForDeal(deal)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {budgetPerItem && (
                  <p className="text-[9px] text-text-muted text-center pb-1">
                    Showing options under ${Math.round(budgetPerItem * 1.5)}/item based on your ${dailyBudget}/day budget · {perDay} per day ({intensity ?? "balanced"})
                  </p>
                )}
              </div>
            );
          })()
        ) : (
          /* ── Flights / Trains: flat horizontal scroll ── */
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pt-3 pb-1">
            {activeDeal.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                tripId={tripId}
                userId={userId}
                booking={findBookingForDeal(deal)}
                wallet={wallet}
                onBookingConfirmed={onBookingConfirmed}
              />
            ))}
          </div>
        )
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
