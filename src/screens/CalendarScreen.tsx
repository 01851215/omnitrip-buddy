import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAllCalendarEvents } from "../hooks/useCalendarEvents";
import { useAuthContext } from "../components/auth/AuthProvider";
import { supabase } from "../services/supabase";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { Button } from "../components/ui/Button";
import { Buddy } from "../components/Buddy";
import { MonthGrid } from "../components/calendar/MonthGrid";
import { BookingBadge } from "../components/booking/BookingBadge";
import { useBookings } from "../hooks/useBookings";
import type { CalendarEvent, Booking } from "../types";

type ViewMode = "timeline" | "month";

const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 to 21:00

function getHour(timeStr: string) {
  return new Date(timeStr).getHours();
}

function formatTime(timeStr: string) {
  return new Date(timeStr).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CalendarScreen() {
  const location = useLocation();
  const { user } = useAuthContext();
  const { events, refresh: refreshEvents } = useAllCalendarEvents();
  const { bookings } = useBookings();
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Refresh calendar data when navigating to this screen
  useEffect(() => { refreshEvents(); }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [monthYear, setMonthYear] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }));
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());
  const [movingEvent, setMovingEvent] = useState<string | null>(null);
  const [addingBuffer, setAddingBuffer] = useState(false);

  const handleIgnoreConflict = useCallback((eventId: string) => {
    setDismissedConflicts((prev) => new Set(prev).add(eventId));
  }, []);

  const handleMoveConflict = useCallback(async (event: CalendarEvent) => {
    setMovingEvent(event.id);
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    start.setHours(start.getHours() + 1);
    end.setHours(end.getHours() + 1);
    await supabase
      .from("calendar_events")
      .update({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        conflicts_with: [],
      })
      .eq("id", event.id);
    setDismissedConflicts((prev) => new Set(prev).add(event.id));
    setMovingEvent(null);
  }, []);

  // Filter events to selected date (for timeline view)
  const dateEvents = events.filter((e) => {
    const d = e.startTime.split("T")[0];
    return d === selectedDate;
  });

  const conflicts = dateEvents.filter(
    (e) => e.conflictsWith.length > 0 && !dismissedConflicts.has(e.id),
  );
  const travelEvents = dateEvents.filter((e) => e.type === "travel").length;
  const intensityLabel = travelEvents >= 3 ? "High" : travelEvents >= 2 ? "Medium" : "Low";

  const handleAddBuffer = useCallback(async () => {
    if (!user || addingBuffer) return;
    setAddingBuffer(true);
    // Place after the last event of the day, or at 12:00 if no events
    const lastEvent = dateEvents.length > 0
      ? dateEvents.reduce((a, b) => (a.endTime > b.endTime ? a : b))
      : null;
    const startHour = lastEvent ? new Date(lastEvent.endTime).getHours() : 12;
    const startMin = lastEvent ? new Date(lastEvent.endTime).getMinutes() : 0;
    const start = `${selectedDate}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
    const endH = startMin >= 30 ? startHour + 1 : startHour;
    const endM = startMin >= 30 ? startMin - 30 : startMin + 30;
    const end = `${selectedDate}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    await supabase.from("calendar_events").insert({
      user_id: user.id,
      source: "omnitrip",
      title: "Mindful Buffer",
      description: "Hydration & stretch break",
      start_time: start,
      end_time: end,
      type: "personal",
      conflicts_with: [],
    });
    refreshEvents();
    setAddingBuffer(false);
  }, [user, addingBuffer, dateEvents, selectedDate, refreshEvents]);

  // Match calendar events to bookings by title overlap
  const findBookingForEvent = useCallback(
    (event: CalendarEvent): Booking | undefined => {
      if (!bookings.length) return undefined;
      return bookings.find(
        (b) =>
          event.title.includes(b.title) ||
          b.title.includes(event.title.replace("✅ ", "")),
      );
    },
    [bookings],
  );

  const handleDaySelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setViewMode("timeline"); // Switch to timeline for that day
  };

  const prevMonth = () => {
    setMonthYear((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setMonthYear((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const monthName = new Date(monthYear.year, monthYear.month).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });

  const selectedDisplay = new Date(selectedDate + "T00:00:00").toLocaleDateString("en", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-bold font-serif">
          {viewMode === "timeline" ? selectedDisplay : monthName}
        </h1>
        <p className="text-sm text-text-secondary mt-1">Your Sanctuary Schedule</p>
      </div>

      {/* Toggle */}
      <div className="px-5 flex gap-1">
        <Chip active={viewMode === "timeline"} onClick={() => setViewMode("timeline")}>
          Timeline
        </Chip>
        <Chip active={viewMode === "month"} onClick={() => setViewMode("month")}>
          Month
        </Chip>
      </div>

      {/* ─── MONTH VIEW ─── */}
      {viewMode === "month" && (
        <div className="px-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center text-text-muted hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <p className="text-sm font-semibold">{monthName}</p>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center text-text-muted hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>

          <Card>
            <MonthGrid
              year={monthYear.year}
              month={monthYear.month}
              events={events}
              selectedDate={selectedDate}
              onSelectDate={handleDaySelect}
            />
          </Card>

          {/* Quick day summary */}
          {dateEvents.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className="mt-3 w-full text-left"
            >
              <Card className="!bg-primary/5 border border-primary/20 hover:!bg-primary/10 transition-colors cursor-pointer">
                <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                  {selectedDisplay}
                </p>
                <div className="space-y-1.5">
                  {dateEvents.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          e.type === "travel" ? "bg-primary" : "bg-success"
                        }`}
                      />
                      <span className="text-xs text-text-secondary truncate">{e.title}</span>
                      <span className="text-[10px] text-text-muted ml-auto whitespace-nowrap">
                        {formatTime(e.startTime)}
                      </span>
                    </div>
                  ))}
                  {dateEvents.length > 3 && (
                    <p className="text-[10px] text-primary font-medium">
                      +{dateEvents.length - 3} more events
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium">
                  View Day <span aria-hidden>→</span>
                </span>
              </Card>
            </button>
          )}
        </div>
      )}

      {/* ─── TIMELINE VIEW ─── */}
      {viewMode === "timeline" && (
        <>
          {/* Timeline */}
          <div className="px-5">
            <div className="relative">
              {hours.map((h) => (
                <div key={h} className="flex items-start min-h-[60px] border-t border-cream-dark/50">
                  <span className="text-[10px] text-text-muted w-12 pt-1 shrink-0">
                    {String(h).padStart(2, "0")}:00
                  </span>
                  <div className="flex-1 relative">
                    {dateEvents
                      .filter((e) => getHour(e.startTime) === h)
                      .map((event) => (
                        <EventCard key={event.id} event={event} booking={findBookingForEvent(event)} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buddy Suggestion - Mindful Buffer */}
          <div className="px-5">
            <Card className="flex items-center gap-3 !bg-cream border-dashed">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <Buddy state="idle" size="mini" mode="video" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Suggested: Mindful Buffer</p>
                <p className="text-[10px] text-text-secondary">Recommended 30m window for hydration & stretch</p>
              </div>
              <button
                type="button"
                onClick={handleAddBuffer}
                disabled={addingBuffer}
                className="text-xs text-primary font-medium whitespace-nowrap disabled:opacity-50"
              >
                {addingBuffer ? "Adding..." : "Add Slot"}
              </button>
            </Card>
          </div>

          {/* Today's Pulse */}
          <div className="px-5">
            <Card>
              <h3 className="font-semibold text-sm mb-3">Today's Pulse</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-8 rounded-full ${intensityLabel === "High" ? "bg-conflict" : intensityLabel === "Medium" ? "bg-accent" : "bg-success"}`} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Travel Intensity</p>
                    <p className="text-sm font-medium">{intensityLabel} ({dateEvents.length} Events)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full bg-accent" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Focus Balance</p>
                    <p className="text-sm font-medium">
                      {dateEvents.length > 4 ? "Fragmented" : dateEvents.length > 2 ? "Balanced" : "Deep"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Buddy Conflict Resolution */}
          {conflicts.length > 0 && (
            <div className="px-5 pb-4">
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
                <div className="flex items-start gap-3 relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                    <Buddy state="idle" size="mini" mode="video" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">Buddy Insight</p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {conflicts[0].buddyResolution ?? "I found a conflict in your schedule. Want me to help resolve it?"}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        className="!text-xs !px-4 !py-2"
                        disabled={movingEvent === conflicts[0].id}
                        onClick={() => handleMoveConflict(conflicts[0])}
                      >
                        {movingEvent === conflicts[0].id ? "Moving..." : "Move +1h"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!text-xs !px-4 !py-2"
                        onClick={() => handleIgnoreConflict(conflicts[0].id)}
                      >
                        Ignore
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, booking }: { event: CalendarEvent; booking?: Booking }) {
  const isTravel = event.type === "travel";
  const hasConflict = event.conflictsWith.length > 0;

  return (
    <div
      className={`rounded-xl p-3 mb-2 ${
        isTravel
          ? "bg-primary text-white"
          : "bg-surface border-l-4 border-l-success border border-cream-dark"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isTravel && (
          <span className="text-[9px] uppercase tracking-wider opacity-80 flex items-center gap-1">
            ✈ Travel Event
          </span>
        )}
        {!isTravel && (
          <span className="text-[9px] uppercase tracking-wider text-text-muted flex items-center gap-1">
            📅 Personal Event
          </span>
        )}
        {booking && (
          <BookingBadge status={booking.status} provider={booking.provider} compact />
        )}
      </div>
      <p className={`text-sm font-semibold ${isTravel ? "" : "text-text"}`}>{event.title}</p>
      {event.description && (
        <p className={`text-[11px] mt-0.5 ${isTravel ? "opacity-80" : "text-text-secondary"}`}>
          {event.description} · {formatTime(event.startTime)} – {formatTime(event.endTime)}
        </p>
      )}
      {booking && (
        <div className="mt-1.5 flex items-center gap-2">
          <BookingBadge status={booking.status} provider={booking.provider} />
          {booking.bookingUrl && (
            <a
              href={booking.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[10px] font-medium ${isTravel ? "text-white/80 underline" : "text-primary underline"}`}
            >
              View Booking
            </a>
          )}
        </div>
      )}
      {hasConflict && !booking && (
        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-conflict text-white text-[9px] font-medium">
          ⚠ Conflict
        </span>
      )}
    </div>
  );
}
