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

export function useAllCalendarEvents() {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load calendar events:", error);
          return;
        }
        setEvents((data ?? []).map(mapCalendarEvent as any));
      });
  }, [user, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { events, refresh };
}
