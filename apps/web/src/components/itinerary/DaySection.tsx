import { useState } from "react";
import type { TripDay, Activity } from "../../hooks/useItinerary";
import { ActivityCard } from "./ActivityCard";

const energyEmoji: Record<string, string> = {
  low: "🌙",
  medium: "☀️",
  high: "⚡",
};

interface DaySectionProps {
  day: TripDay;
  activities: Activity[];
  onToggle: (id: string, status: "completed" | "skipped" | "planned") => void;
  onAddClick: (dayId: string, date: string) => void;
  isToday: boolean;
}

export function DaySection({ day, activities, onToggle, onAddClick, isToday }: DaySectionProps) {
  const [expanded, setExpanded] = useState(isToday || activities.some((a) => a.status === "planned"));
  const completed = activities.filter((a) => a.status === "completed").length;
  const dateLabel = new Date(day.date + "T00:00:00").toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mb-4">
      {/* Day header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-1 py-2"
      >
        <div className="flex items-center gap-2">
          {isToday && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          <span className="text-sm font-semibold">{dateLabel}</span>
          <span className="text-xs">{energyEmoji[day.energyLevel] ?? "☀️"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">
            {completed}/{activities.length}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Buddy note */}
      {expanded && day.buddyNotes.length > 0 && (
        <p className="text-[11px] text-text-secondary italic px-1 mb-2">
          {day.buddyNotes[0]}
        </p>
      )}

      {/* Activities */}
      {expanded && (
        <div className="space-y-2">
          {activities
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onToggle={onToggle} />
            ))}

          {/* Add button */}
          <button
            type="button"
            onClick={() => onAddClick(day.id, day.date)}
            className="w-full py-2 rounded-xl border-2 border-dashed border-cream-dark text-xs text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            + Add activity
          </button>
        </div>
      )}
    </div>
  );
}
