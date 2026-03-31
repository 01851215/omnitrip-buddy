import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";
import { mapTrip, mapDreamTrip, mapDestination } from "../utils/mapRow";
import type { Trip, DreamTrip, TripStatus } from "../types";

export function useActiveTrip() {
  const { user } = useAuthContext();
  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    // Prefer active trips, fall back to planning; newest first within each status
    supabase.from("trips").select("*").eq("user_id", user.id).in("status", ["active", "planning"])
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle()
      .then(({ data }) => { setTrip(data ? mapTrip(data as any) : undefined); setLoading(false); });
  }, [user, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // Refresh when tab regains focus so navigating back always shows latest state
  useEffect(() => {
    const handler = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refresh]);

  return { trip, loading, refresh };
}

export function useCompletedTrips() {
  const { user } = useAuthContext();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    supabase.from("trips").select("*").eq("user_id", user.id).eq("status", "completed")
      .then(({ data }) => { setTrips((data ?? []).map(mapTrip as any)); setLoading(false); });
  }, [user]);

  return { trips, loading };
}

export function useAllTrips() {
  const { user } = useAuthContext();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    supabase.from("trips").select("*").eq("user_id", user.id)
      .then(({ data }) => { setTrips((data ?? []).map(mapTrip as any)); setLoading(false); });
  }, [user]);

  return { trips, loading };
}

export function useDreamTrips() {
  const { user } = useAuthContext();
  const [trips, setTrips] = useState<DreamTrip[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("dream_trips").select("*").eq("user_id", user.id)
      .then(({ data }) => setTrips((data ?? []).map(mapDreamTrip as any)));
  }, [user]);

  return trips;
}

export function useDestinations(tripId?: string) {
  const [destinations, setDestinations] = useState<ReturnType<typeof mapDestination>[]>([]);

  useEffect(() => {
    if (!tripId) { setDestinations([]); return; }
    supabase.from("destinations").select("*").eq("trip_id", tripId)
      .then(({ data }) => setDestinations((data ?? []).map(mapDestination as any)));
  }, [tripId]);

  return destinations;
}

export interface DestinationCoord {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  arrivalDate: string;
}

export function useAllDestinations() {
  const { user } = useAuthContext();
  const [destinations, setDestinations] = useState<DestinationCoord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const toCoords = (rows: any[]): DestinationCoord[] =>
      rows
        .filter((d: any) => d.lat != null && d.lng != null)
        .map((d: any) => ({
          id: d.id,
          name: d.name ?? "",
          country: d.country ?? "",
          lat: d.lat,
          lng: d.lng,
          arrivalDate: d.arrival_date ?? "",
        }));

    (async () => {
      const { data } = await supabase
        .from("destinations")
        .select("id, name, country, lat, lng, arrival_date, trip_id, trips!inner(user_id)")
        .eq("trips.user_id", user.id)
        .order("arrival_date", { ascending: true });

      let results = toCoords(data ?? []);

      if (results.length === 0) {
        const { data: trips } = await supabase
          .from("trips")
          .select("id")
          .eq("user_id", user.id);

        if (trips && trips.length > 0) {
          const { data: fallbackData } = await supabase
            .from("destinations")
            .select("id, name, country, lat, lng, arrival_date")
            .in("trip_id", trips.map((t) => t.id))
            .order("arrival_date", { ascending: true });

          results = toCoords(fallbackData ?? []);
        }
      }

      setDestinations(results);
      setLoading(false);
    })();
  }, [user]);

  return { destinations, loading };
}

export async function updateTripStatus(tripId: string, status: TripStatus): Promise<boolean> {
  const { error } = await supabase
    .from("trips")
    .update({ status })
    .eq("id", tripId);
  return !error;
}
