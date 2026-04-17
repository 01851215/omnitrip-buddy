import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";
import { mapJournalEntry, mapReflection } from "../utils/mapRow";
import type { JournalEntry, TripReflection } from "../types";

export function useJournalEntries(tripId?: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let query = supabase.from("journal_entries").select("*");
    if (tripId) query = query.eq("trip_id", tripId);
    query.order("date", { ascending: true }).then(({ data }) => setEntries((data ?? []).map(mapJournalEntry as any)));
  }, [tripId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { entries, refresh };
}

export async function createJournalEntry(params: {
  tripId: string;
  text: string;
  locationName: string;
  date?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("journal_entries").insert({
    trip_id: params.tripId,
    text: params.text,
    location_name: params.locationName,
    date: params.date ?? new Date().toISOString().split("T")[0],
  });
  return !error;
}

export function useTripReflection(tripId?: string) {
  const [reflection, setReflection] = useState<TripReflection | undefined>(undefined);

  useEffect(() => {
    if (!tripId) { setReflection(undefined); return; }
    supabase.from("trip_reflections").select("*").eq("trip_id", tripId).single()
      .then(({ data }) => setReflection(data ? mapReflection(data as any) : undefined));
  }, [tripId]);

  return reflection;
}

export function useTravelProfile(userId?: string) {
  const { user } = useAuthContext();
  const uid = userId ?? user?.id;
  const [profile, setProfile] = useState<Record<string, unknown> | undefined>(undefined);

  useEffect(() => {
    if (!uid) return;
    supabase.from("travel_profiles").select("*").eq("user_id", uid).single()
      .then(({ data }) => setProfile(data ?? undefined));
  }, [uid]);

  return profile;
}
