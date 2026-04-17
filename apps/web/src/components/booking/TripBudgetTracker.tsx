/**
 * TripBudgetTracker — shows booking spend vs. planned daily budget.
 * Appears in PlanningScreen below the deals panel.
 */
import { useBookings } from "../../hooks/useBookings";

interface TripBudgetTrackerProps {
  tripId: string;
  dailyBudget?: number;     // $/day from the preset
  tripDays?: number;        // total trip length
}

const CATEGORY_EMOJI: Record<string, string> = {
  flights:    "✈️",
  hotels:     "🏨",
  activities: "🎭",
  dining:     "🍽️",
  trains:     "🚆",
};

const CATEGORY_COLOR: Record<string, string> = {
  flights:    "bg-blue-400",
  hotels:     "bg-primary",
  activities: "bg-amber-400",
  dining:     "bg-orange-400",
  trains:     "bg-purple-400",
};

export function TripBudgetTracker({ tripId, dailyBudget, tripDays }: TripBudgetTrackerProps) {
  const { bookings } = useBookings(tripId);

  // Only confirmed / external bookings count
  const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "external");

  if (confirmed.length === 0) return null;

  const totalSpent = confirmed.reduce((s, b) => s + (b.priceAmount ?? 0), 0);
  const budget     = dailyBudget && tripDays ? dailyBudget * tripDays : 0;
  const pct        = budget > 0 ? Math.min(totalSpent / budget, 1) : 0;
  const barColor   = pct >= 1 ? "bg-red-500" : pct >= 0.8 ? "bg-amber-500" : "bg-primary";

  // Group by category
  const byCategory: Record<string, number> = {};
  for (const b of confirmed) {
    const cat = b.dealCategory ?? "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + (b.priceAmount ?? 0);
  }

  return (
    <div className="mx-5 mt-4 bg-surface rounded-2xl border border-cream-dark p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text">Trip Spending</p>
        {budget > 0 && (
          <p className="text-[10px] text-text-muted">
            ${Math.round(totalSpent)} / ${Math.round(budget)} budget
          </p>
        )}
      </div>

      {/* Progress bar */}
      {budget > 0 && (
        <div>
          <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <p className={`text-[10px] mt-0.5 font-medium ${pct >= 1 ? "text-red-500" : pct >= 0.8 ? "text-amber-500" : "text-primary"}`}>
            {pct >= 1
              ? `Over budget by $${Math.round(totalSpent - budget)}`
              : `$${Math.round(budget - totalSpent)} remaining`}
          </p>
        </div>
      )}

      {/* Category breakdown */}
      <div className="space-y-1.5">
        {Object.entries(byCategory).map(([cat, amount]) => {
          const catPct = totalSpent > 0 ? amount / totalSpent : 0;
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center">{CATEGORY_EMOJI[cat] ?? "📦"}</span>
              <div className="flex-1">
                <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLOR[cat] ?? "bg-gray-400"}`}
                    style={{ width: `${catPct * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-medium text-text w-12 text-right">
                ${Math.round(amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Booked items list */}
      <div className="space-y-1 pt-1 border-t border-cream-dark">
        {confirmed.map((b) => (
          <div key={b.id} className="flex items-center gap-2">
            <span className="text-xs">{CATEGORY_EMOJI[b.dealCategory ?? ""] ?? "📦"}</span>
            <p className="flex-1 text-[11px] text-text truncate">{b.title}</p>
            <span className="text-[10px] font-semibold text-text flex-shrink-0">
              ${b.priceAmount?.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
