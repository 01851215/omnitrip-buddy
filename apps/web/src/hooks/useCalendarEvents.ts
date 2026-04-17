import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";
import { mapCalendarEvent } from "../utils/mapRow";
import type { CalendarEvent } from "../types";

export function useCalendarEvents(date?: string) {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    let query = supabase.from("calendar_events").select("*").eq("user_id", user.id);
    if (date) {
      query = query.gte("start_time", `${date}T00:00:00`).lte("start_time", `${date}T23:59:59`);
    }
    query.then(({ data }) => setEvents((data ?? []).map(mapCalendarEvent as any)));
  }, [user, date]);

  return events;
}

function activityToCalendarEvent(row: any): CalendarEvent {
  return {
    id: `activity-${row.id}`,
    tripId: row.trip_id,
    source: "omnitrip" as CalendarEvent["source"],
    title: row.title,
    description: `${row.type ?? "activity"} in ${row.location_name ?? ""}`.trim(),
    startTime: row.start_time,
    endTime: row.end_time,
    type: "travel" as CalendarEvent["type"],
    conflictsWith: [],
  };
}

export function useAllCalendarEvents() {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;

    (async () => {
      // 1. Load explicit calendar events
      const { data: calData } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true });

      const calEvents: CalendarEvent[] = (calData ?? []).map(mapCalendarEvent as any);

      // 2. Load itinerary activities (the source of truth for trip plans)
      //    First get user's trips, then their activities
      const { data: trips } = await supabase
        .from("trips")
        .select("id")
        .eq("user_id", user.id);

      let actEvents: CalendarEvent[] = [];
      if (trips && trips.length > 0) {
        const tripIds = trips.map((t) => t.id);
        const { data: actData } = await supabase
          .from("activities")
          .select("*")
          .in("trip_id", tripIds)
          .order("start_time", { ascending: true });

        actEvents = (actData ?? [])
          .filter((a: any) => a.status !== "skipped")
          .map(activityToCalendarEvent);
      }

      // Deduplicate: prefer calendar_events over activities (they may have booking metadata)
      const calKeys = new Set(calEvents.map((e) => `${e.title}::${e.startTime}`));
      const uniqueActEvents = actEvents.filter((e) => !calKeys.has(`${e.title}::${e.startTime}`));

      const merged = [...calEvents, ...uniqueActEvents].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );

      setEvents(merged);
    })();
  }, [user, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { events, refresh };
}
