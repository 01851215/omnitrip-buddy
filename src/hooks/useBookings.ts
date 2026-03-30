import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";
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
    let query = supabase.from("bookings").select("*").eq("user_id", user.id);
    if (tripId) query = query.eq("trip_id", tripId);

    query.order("created_at", { ascending: false }).then(({ data }) => {
      setBookings((data ?? []).map(mapBooking as any));
      setLoading(false);
    });
  }, [user, tripId, version]);

  // Subscribe to realtime changes
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

  // Also refresh when tab regains focus (catches Stripe redirect returns)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setVersion((v) => v + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { bookings, loading, refresh };
}
