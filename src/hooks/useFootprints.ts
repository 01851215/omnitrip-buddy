import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";
import { mapJournalEntry, mapReflection } from "../utils/mapRow";

export function useJournalEntries(tripId?: string) {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    let query = supabase.from("journal_entries").select("*");
    if (tripId) query = query.eq("trip_id", tripId);
    query.order("date", { ascending: true }).then(({ data }) => setEntries((data ?? []).map(mapJournalEntry)));
  }, [tripId]);

  return entries;
}

export function useTripReflection(tripId?: string) {
  const [reflection, setReflection] = useState<any>(undefined);

  useEffect(() => {
    if (!tripId) { setReflection(undefined); return; }
    supabase.from("trip_reflections").select("*").eq("trip_id", tripId).single()
      .then(({ data }) => setReflection(data ? mapReflection(data) : undefined));
  }, [tripId]);

  return reflection;
}

export function useTravelProfile(userId?: string) {
  const { user } = useAuthContext();
  const uid = userId ?? user?.id;
  const [profile, setProfile] = useState<any>(undefined);

  useEffect(() => {
    if (!uid) return;
    supabase.from("travel_profiles").select("*").eq("user_id", uid).single()
      .then(({ data }) => setProfile(data ?? undefined));
  }, [uid]);

  return profile;
}
