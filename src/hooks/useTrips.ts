import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";
import { mapTrip, mapDreamTrip, mapDestination } from "../utils/mapRow";

export function useActiveTrip() {
  const { user } = useAuthContext();
  const [trip, setTrip] = useState<any>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase.from("trips").select("*").eq("user_id", user.id).eq("status", "active").limit(1).single()
      .then(({ data }) => setTrip(data ? mapTrip(data) : undefined));
  }, [user]);

  return trip;
}

export function useCompletedTrips() {
  const { user } = useAuthContext();
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("trips").select("*").eq("user_id", user.id).eq("status", "completed")
      .then(({ data }) => setTrips((data ?? []).map(mapTrip)));
  }, [user]);

  return trips;
}

export function useAllTrips() {
  const { user } = useAuthContext();
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("trips").select("*").eq("user_id", user.id)
      .then(({ data }) => setTrips((data ?? []).map(mapTrip)));
  }, [user]);

  return trips;
}

export function useDreamTrips() {
  const { user } = useAuthContext();
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("dream_trips").select("*").eq("user_id", user.id)
      .then(({ data }) => setTrips((data ?? []).map(mapDreamTrip)));
  }, [user]);

  return trips;
}

export function useDestinations(tripId?: string) {
  const [destinations, setDestinations] = useState<any[]>([]);

  useEffect(() => {
    if (!tripId) { setDestinations([]); return; }
    supabase.from("destinations").select("*").eq("trip_id", tripId)
      .then(({ data }) => setDestinations((data ?? []).map(mapDestination)));
  }, [tripId]);

  return destinations;
}
