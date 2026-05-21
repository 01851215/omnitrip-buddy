import { useState, useMemo } from "react";
import { Button } from "../ui/Button";
import type { RouteSuggestion } from "../../services/tripAI";
import { templates } from "../../data/templates";

// ── Types ──────────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  transport: "🚗",
  accommodation: "🏠",
  food: "🍜",
  experience: "✨",
  rest: "🧘",
  free: "🎉",
};

export interface ActivityKey {
  /** `"{destIndex}-{actIndex}"` — stable identifier pre-DB creation */
  key: string;
}

interface ActivityItem extends ActivityKey {
  title: string;
  type: string;
  estimatedCost: number;
  startHour: number;
  dayDate: string;       // ISO yyyy-mm-dd
  destinationName: string;
}

interface DayGroup {
  date: string;          // ISO yyyy-mm-dd
  label: string;         // "Day 1 — Sat 26 Apr"
  destinationName: string;
  activities: ActivityItem[];
}

// ── Build preview data (mirrors the handleAddToTrip assignment logic) ──────────

export function buildItineraryDays(
  route: RouteSuggestion,
  tripStart: Date,
): { days: DayGroup[]; allKeys: string[] } {
  const tpl = templates.find((t) => t.id === route.templateId);
  const destinations = route.generatedData?.destinations ?? tpl?.destinations ?? [];

  const days: DayGroup[] = [];
  const allKeys: string[] = [];
  let dayOffset = 0;

  for (let di = 0; di < destinations.length; di++) {
    const dest = destinations[di];
    const arrival = new Date(tripStart);
    arrival.setDate(arrival.getDate() + dayOffset);

    const sortedDates: string[] = [];
    for (let d = 0; d < dest.days; d++) {
      const date = new Date(arrival);
      date.setDate(date.getDate() + d);
      sortedDates.push(date.toISOString().split("T")[0]);
    }

    // Group round-robin, same assignment as handleAddToTrip
    const byDay = new Map<string, ActivityItem[]>();
    sortedDates.forEach((d) => byDay.set(d, []));

    dest.activities.forEach((act, idx) => {
      const dateKey = sortedDates[idx % sortedDates.length];
      const hour = 8 + (idx % 4) * 3; // 8am, 11am, 2pm, 5pm
      const key = `${di}-${idx}`;
      allKeys.push(key);
      byDay.get(dateKey)!.push({
        key,
        title: act.title,
        type: act.type,
        estimatedCost: act.estimatedCost ?? 0,
        startHour: hour,
        dayDate: dateKey,
        destinationName: dest.name,
      });
    });

    sortedDates.forEach((dateStr, d) => {
      const date = new Date(dateStr + "T00:00:00");
      const label = `Day ${dayOffset + d + 1} · ${date.toLocaleDateString("en", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })}`;
      days.push({
        date: dateStr,
        label,
        destinationName: dest.name,
        activities: byDay.get(dateStr) ?? [],
      });
    });

    dayOffset += dest.days;
  }

  return { days, allKeys };
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  route: RouteSuggestion;
  tripStart: Date;
  onConfirm: (selectedKeys: Set<string>) => void;
  onClose: () => void;
  isAdding: boolean;
}

export function ItineraryPreviewSheet({ route, tripStart, onConfirm, onClose, isAdding }: Props) {
  const { days, allKeys } = useMemo(
    () => buildItineraryDays(route, tripStart),
    [route, tripStart],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(allKeys));

  const toggleAll = () =>
    setSelected(selected.size === allKeys.length ? new Set() : new Set(allKeys));

  const toggleKey = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const tpl = templates.find((t) => t.id === route.templateId);
  const duration =
    route.generatedData?.duration ??
    (typeof route.duration === "string" ? parseInt(route.duration) : route.duration) ??
    tpl?.duration ??
    7;

  const tripEnd = new Date(tripStart);
  tripEnd.setDate(tripEnd.getDate() + duration);

  const dateRange = `${tripStart.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${tripEnd.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="relative bg-surface rounded-t-3xl w-full max-w-[430px] flex flex-col animate-slide-up"
        style={{ maxHeight: "88vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-cream-dark" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-cream-dark flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-serif font-semibold text-xl text-text-primary leading-tight">
                {route.title}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">{dateRange}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted text-2xl leading-none mt-0.5 flex-shrink-0 hover:text-text-primary transition-colors"
            >
              ×
            </button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-text-muted">
              {allKeys.length} activit{allKeys.length === 1 ? "y" : "ies"} · {days.length} day{days.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary font-medium hover:opacity-70 transition-opacity"
            >
              {selected.size === allKeys.length ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {days.map((day) => (
            <div key={day.date}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted whitespace-nowrap">
                  {day.label}
                </span>
                <div className="flex-1 border-t border-cream-dark" />
                <span className="text-[10px] text-text-muted italic whitespace-nowrap">
                  {day.destinationName}
                </span>
              </div>

              {day.activities.length === 0 ? (
                <p className="text-xs text-text-muted italic pl-1">Free day · explore at your own pace</p>
              ) : (
                <div className="space-y-2">
                  {day.activities.map((act) => {
                    const isSelected = selected.has(act.key);
                    return (
                      <button
                        key={act.key}
                        type="button"
                        onClick={() => toggleKey(act.key)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? "bg-surface border-cream-dark"
                            : "bg-cream/40 border-cream-dark/50 opacity-45"
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border-2 border-cream-dark block" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{TYPE_EMOJI[act.type] ?? "📍"}</span>
                            <span className="text-sm font-medium text-text-primary truncate">
                              {act.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-muted">
                              {String(act.startHour).padStart(2, "0")}:00 –{" "}
                              {String(act.startHour + 2).padStart(2, "0")}:00
                            </span>
                            {act.estimatedCost > 0 && (
                              <>
                                <span className="text-[10px] text-text-muted">·</span>
                                <span className="text-[10px] text-primary font-medium">
                                  ~${act.estimatedCost}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-cream-dark flex-shrink-0 bg-surface rounded-b-none">
          <Button
            className="w-full"
            disabled={selected.size === 0 || isAdding}
            onClick={() => onConfirm(selected)}
          >
            {isAdding
              ? "Saving trip…"
              : selected.size === 0
              ? "Select activities to add"
              : `Save Trip & Add ${selected.size} to Calendar`}
          </Button>
        </div>
      </div>
    </div>
  );
}
