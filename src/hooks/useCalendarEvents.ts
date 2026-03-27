import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";
import { mapCalendarEvent } from "../utils/mapRow";

export function useCalendarEvents(date?: string) {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let query = supabase.from("calendar_events").select("*").eq("user_id", user.id);
    if (date) {
      query = query.gte("start_time", `${date}T00:00:00`).lte("start_time", `${date}T23:59:59`);
    }
    query.then(({ data }) => setEvents((data ?? []).map(mapCalendarEvent)));
  }, [user, date]);

  return events;
}

export function useAllCalendarEvents() {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("calendar_events").select("*").eq("user_id", user.id)
      .then(({ data }) => setEvents((data ?? []).map(mapCalendarEvent)));
  }, [user]);

  return events;
}
