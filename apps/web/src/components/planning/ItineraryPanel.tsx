/**
 * ItineraryPanel — inline trip itinerary shown after "Add to Trip".
 * Mirrors the DealsPanel UI: destination tabs + scrollable activity cards
 * each with an individual "📅 Add to Calendar" button.
 */
import { useState } from "react";
import { supabase } from "../../services/supabase";

// ── Public types (shared with PlanningScreen) ──────────────────────────────────

export interface ItineraryActivity {
  key: string;
  title: string;
  type: string;
  estimatedCost: number;
  startTime: string;   // ISO datetime
  endTime: string;
  dayDate: string;     // yyyy-mm-dd for display
  destinationName: string;
  destId: string;
  tripDayId: string;
}

export interface ItineraryDestGroup {
  name: string;
  country: string;
  daysCount: number;
  activities: ItineraryActivity[];
}

export interface ItineraryData {
  tripId: string;
  destGroups: ItineraryDestGroup[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  transport: "🚗",
  accommodation: "🏠",
  food: "🍜",
  experience: "✨",
  rest: "🧘",
  free: "🎉",
};

// ── Activity Card ──────────────────────────────────────────────────────────────

function ActivityCard({
  act,
  tripId,
  userId,
}: {
  act: ItineraryActivity;
  tripId: string;
  userId: string;
}) {
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  const time = new Date(act.startTime).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const date = new Date(act.dayDate + "T00:00:00").toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleAdd = async () => {
    setAdding(true);
    try {
      // Insert into activities table
      await supabase.from("activities").insert({
        trip_day_id: act.tripDayId,
        trip_id: tripId,
        destination_id: act.destId,
        title: act.title,
        type: act.type,
        start_time: act.startTime,
        end_time: act.endTime,
        location_name: act.destinationName,
        status: "planned",
        sort_order: 0,
        estimated_cost_amount: act.estimatedCost > 0 ? act.estimatedCost : null,
        buddy_suggested: false,
      });
      // Sync to calendar_events
      await supabase.from("calendar_events").insert({
        user_id: userId,
        trip_id: tripId,
        source: "omnitrip",
        title: act.title,
        description: `${act.type} in ${act.destinationName}`,
        start_time: act.startTime,
        end_time: act.endTime,
        type: "travel",
        conflicts_with: [],
      });
      setAdded(true);
    } catch (err) {
      console.error("Failed to add activity to calendar:", err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-56 bg-surface rounded-2xl border border-cream-dark overflow-hidden flex flex-col">
      {/* Colour strip by type */}
      <div
        className="h-1.5 w-full"
        style={{
          background:
            act.type === "food"
              ? "#F59E0B"
              : act.type === "experience"
              ? "#8B5CF6"
              : act.type === "transport"
              ? "#3B82F6"
              : act.type === "accommodation"
              ? "#10B981"
              : "#9CA3AF",
        }}
      />

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <div className="flex items-start gap-2">
          <span className="text-base flex-shrink-0 mt-0.5">
            {TYPE_EMOJI[act.type] ?? "📍"}
          </span>
          <p className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
            {act.title}
          </p>
        </div>

        {/* Date + time */}
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-text-muted">{date}</p>
          <p className="text-[10px] text-text-muted">{time}</p>
        </div>

        {/* Cost */}
        {act.estimatedCost > 0 && (
          <p className="text-[10px] font-medium text-primary">
            ~${act.estimatedCost}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        {added ? (
          <p className="text-[10px] text-center text-success font-medium py-1.5">
            ✓ Added to calendar
          </p>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="w-full text-[10px] font-medium text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/15 transition-colors disabled:opacity-60"
          >
            {adding ? "Adding…" : "📅 Add to Calendar"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

interface ItineraryPanelProps {
  data: ItineraryData;
  userId: string;
}

export function ItineraryPanel({ data, userId }: ItineraryPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const group = data.destGroups[activeTab];

  const [addedAll, setAddedAll] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  const handleAddAll = async () => {
    setAddingAll(true);
    try {
      const activityRows = data.destGroups.flatMap((g) =>
        g.activities.map((act) => ({
          trip_day_id: act.tripDayId,
          trip_id: data.tripId,
          destination_id: act.destId,
          title: act.title,
          type: act.type,
          start_time: act.startTime,
          end_time: act.endTime,
          location_name: act.destinationName,
          status: "planned" as const,
          sort_order: 0,
          estimated_cost_amount: act.estimatedCost > 0 ? act.estimatedCost : null,
          buddy_suggested: false,
        })),
      );
      const calendarRows = data.destGroups.flatMap((g) =>
        g.activities.map((act) => ({
          user_id: userId,
          trip_id: data.tripId,
          source: "omnitrip" as const,
          title: act.title,
          description: `${act.type} in ${act.destinationName}`,
          start_time: act.startTime,
          end_time: act.endTime,
          type: "travel" as const,
          conflicts_with: [],
        })),
      );
      if (activityRows.length) await supabase.from("activities").insert(activityRows);
      if (calendarRows.length) await supabase.from("calendar_events").insert(calendarRows);
      setAddedAll(true);
    } catch (err) {
      console.error("Failed to add all to calendar:", err);
    } finally {
      setAddingAll(false);
    }
  };

  return (
    <div className="mt-4 -mx-4">
      {/* Header */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🗓️</span>
          <div>
            <p className="text-sm font-bold text-text-primary">Your Itinerary</p>
            <p className="text-[10px] text-text-muted">
              {data.destGroups.map((g) => g.name).join(" · ")} ·{" "}
              {data.destGroups.reduce((s, g) => s + g.activities.length, 0)} activities
            </p>
          </div>
        </div>

        {/* Add all button */}
        {!addedAll ? (
          <button
            type="button"
            onClick={handleAddAll}
            disabled={addingAll}
            className="text-[10px] font-medium text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/15 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {addingAll ? "Adding…" : "Add all"}
          </button>
        ) : (
          <span className="text-[10px] text-success font-medium">✓ All added</span>
        )}
      </div>

      {/* Destination tabs */}
      {data.destGroups.length > 1 && (
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-1 mb-2">
          {data.destGroups.map((g, i) => (
            <button
              key={g.name}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === i
                  ? "bg-primary text-white"
                  : "bg-cream text-text-muted border border-cream-dark"
              }`}
            >
              {g.name}
              <span
                className={`text-[9px] px-1 rounded-full font-bold ${
                  activeTab === i
                    ? "bg-white/20 text-white"
                    : "bg-cream-dark text-text-muted"
                }`}
              >
                {g.daysCount}d
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Activity cards — horizontal scroll */}
      {group && (
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-2">
          {group.activities.length === 0 ? (
            <p className="text-xs text-text-muted italic px-1 py-3">
              No activities for this destination yet.
            </p>
          ) : (
            group.activities.map((act) => (
              <ActivityCard
                key={act.key}
                act={act}
                tripId={data.tripId}
                userId={userId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
