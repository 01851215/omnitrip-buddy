import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../auth/context";
import { mapBooking } from "../utils/mapRow";
import type { Booking } from "../types";

/**
 * Fetches bookings for the current user, optionally filtered by trip.
 * Subscribes to Supabase Realtime for live updates (e.g. webhook confirmations).
 */
export function useBookings(tripId?: string) {
  const { user } = useAuthContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from("bookings").select("*").eq("user_id", user.id);
    if (tripId) query = query.eq("trip_id", tripId);

    query.order("created_at", { ascending: false }).then(({ data }: { data: unknown[] | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBookings((data ?? []).map(mapBooking as any));
      setLoading(false);
    });
  }, [user, tripId, version]);

  // Subscribe to Supabase Realtime for live booking status updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${user.id}`,
        },
        () => setVersion((v) => v + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Note: document.visibilitychange is intentionally omitted — it's web-only.
  // Each app (web/mobile) can call refresh() on app focus/foreground if desired.

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { bookings, loading, refresh };
}
