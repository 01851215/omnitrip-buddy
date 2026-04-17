import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

export interface Activity {
  id: string;
  tripDayId: string;
  tripId: string;
  destinationId: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  locationName: string;
  status: "planned" | "completed" | "skipped";
  estimatedCost?: number;
  actualCost?: number;
  rating?: number;
  notes?: string;
  buddySuggested?: boolean;
  sortOrder: number;
}

export interface TripDay {
  id: string;
  tripId: string;
  date: string;
  buddyNotes: string[];
  energyLevel: string;
}

function mapTripDay(row: any): TripDay {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    buddyNotes: row.buddy_notes ?? [],
    energyLevel: row.energy_level ?? "medium",
  };
}

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    tripDayId: row.trip_day_id,
    tripId: row.trip_id,
    destinationId: row.destination_id,
    title: row.title,
    type: row.type,
    startTime: row.start_time,
    endTime: row.end_time,
    locationName: row.location_name,
    status: row.status ?? "planned",
    estimatedCost: row.estimated_cost_amount,
    actualCost: row.actual_cost_amount,
    rating: row.rating,
    notes: row.notes,
    buddySuggested: row.buddy_suggested,
    sortOrder: row.sort_order ?? 0,
  };
}

export function useTripDays(tripId?: string) {
  const [days, setDays] = useState<TripDay[]>([]);

  useEffect(() => {
    if (!tripId) { setDays([]); return; }
    supabase.from("trip_days").select("*").eq("trip_id", tripId).order("date")
      .then(({ data }) => setDays((data ?? []).map(mapTripDay)));
  }, [tripId]);

  return days;
}

export function useActivities(tripId?: string, destinationId?: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!tripId) { setActivities([]); return; }
    let query = supabase.from("activities").select("*").eq("trip_id", tripId);
    if (destinationId) query = query.eq("destination_id", destinationId);
    query.order("sort_order").then(({ data }) => setActivities((data ?? []).map(mapActivity)));
  }, [tripId, destinationId, version]);

  const toggleStatus = useCallback(async (activityId: string, newStatus: "completed" | "skipped" | "planned") => {
    await supabase.from("activities").update({ status: newStatus }).eq("id", activityId);

    const activity = activities.find((a) => a.id === activityId);
    if (activity && tripId) {
      const { data: trip } = await supabase.from("trips").select("user_id").eq("id", tripId).single();
      const userId = trip?.user_id;
      if (userId) {
        if (newStatus === "skipped") {
          await supabase.from("calendar_events")
            .delete()
            .eq("user_id", userId)
            .eq("title", activity.title)
            .eq("start_time", activity.startTime);
        } else {
          const { data: existing } = await supabase.from("calendar_events")
            .select("id")
            .eq("user_id", userId)
            .eq("title", activity.title)
            .eq("start_time", activity.startTime)
            .maybeSingle();

          if (!existing) {
            await supabase.from("calendar_events").insert({
              user_id: userId,
              trip_id: tripId,
              source: "omnitrip",
              title: activity.title,
              description: `${activity.type} in ${activity.locationName}`,
              start_time: activity.startTime,
              end_time: activity.endTime,
              type: "travel",
              conflicts_with: [],
            });
          }
        }
      }
    }

    setVersion((v) => v + 1);
  }, [activities, tripId]);

  const addActivity = useCallback(async (activity: {
    tripDayId: string; tripId: string; destinationId: string;
    title: string; type: string; startTime: string; endTime: string;
    locationName: string; estimatedCost?: number;
  }) => {
    await supabase.from("activities").insert({
      trip_day_id: activity.tripDayId,
      trip_id: activity.tripId,
      destination_id: activity.destinationId,
      title: activity.title,
      type: activity.type,
      start_time: activity.startTime,
      end_time: activity.endTime,
      location_name: activity.locationName,
      estimated_cost_amount: activity.estimatedCost,
      status: "planned",
      sort_order: 99,
    });
    setVersion((v) => v + 1);
  }, []);

  return { activities, toggleStatus, addActivity };
}
