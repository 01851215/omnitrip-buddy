import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "../components/auth/AuthProvider";
import { supabase } from "../services/supabase";

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  username: string;
  buddyName: string;
  age: number | null;
  bio: string;
  avatarUrl: string;
  createdAt: string;
}

export interface TravelProfile {
  userId: string;
  pacePreference: number;
  budgetStyle: string;
  activityPreferences: string[];
  timeOfDayPattern: string;
  cuisinePreferences: string[];
  avoidances: string[];
  notificationSettings: Record<string, unknown>;
  buddySettings: Record<string, unknown>;
  lastUpdated: string;
}

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    email: row.email as string,
    displayName: (row.display_name as string) ?? "",
    username: (row.username as string) ?? "",
    buddyName: (row.buddy_name as string) ?? "",
    age: (row.age as number) ?? null,
    bio: (row.bio as string) ?? "",
    avatarUrl: (row.avatar_url as string) ?? "",
    createdAt: (row.created_at as string) ?? "",
  };
}

function rowToTravelProfile(row: Record<string, unknown>): TravelProfile {
  return {
    userId: row.user_id as string,
    pacePreference: (row.pace_preference as number) ?? 3,
    budgetStyle: (row.budget_style as string) ?? "moderate",
    activityPreferences: (row.activity_preferences as string[]) ?? [],
    timeOfDayPattern: (row.time_of_day_pattern as string) ?? "",
    cuisinePreferences: (row.cuisine_preferences as string[]) ?? [],
    avoidances: (row.avoidances as string[]) ?? [],
    notificationSettings: (row.notification_settings as Record<string, unknown>) ?? {},
    buddySettings: (row.buddy_settings as Record<string, unknown>) ?? {},
    lastUpdated: (row.last_updated as string) ?? "",
  };
}

export function useProfile() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [travelProfile, setTravelProfile] = useState<TravelProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setTravelProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      const [profileRes, travelRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).single(),
        supabase.from("travel_profiles").select("*").eq("user_id", user!.id).single(),
      ]);

      if (cancelled) return;

      if (profileRes.data) {
        setProfile(rowToProfile(profileRes.data));
      }
      if (travelRes.data) {
        setTravelProfile(rowToTravelProfile(travelRes.data));
      }

      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [user]);

  const updateProfile = useCallback(
    async (fields: Partial<Profile>) => {
      if (!user) return;

      // Optimistic update
      setProfile((prev) => (prev ? { ...prev, ...fields } : prev));

      const dbFields: Record<string, unknown> = {};
      if (fields.displayName !== undefined) dbFields.display_name = fields.displayName;
      if (fields.username !== undefined) dbFields.username = fields.username;
      if (fields.buddyName !== undefined) dbFields.buddy_name = fields.buddyName;
      if (fields.age !== undefined) dbFields.age = fields.age;
      if (fields.bio !== undefined) dbFields.bio = fields.bio;
      if (fields.avatarUrl !== undefined) dbFields.avatar_url = fields.avatarUrl;

      await supabase
        .from("profiles")
        .upsert({ id: user.id, ...dbFields }, { onConflict: "id" });
    },
    [user],
  );

  const updateTravelProfile = useCallback(
    async (fields: Partial<TravelProfile>) => {
      if (!user) return;

      // Optimistic update
      setTravelProfile((prev) =>
        prev ? { ...prev, ...fields } : prev,
      );

      const dbFields: Record<string, unknown> = {};
      if (fields.pacePreference !== undefined) dbFields.pace_preference = fields.pacePreference;
      if (fields.budgetStyle !== undefined) dbFields.budget_style = fields.budgetStyle;
      if (fields.activityPreferences !== undefined) dbFields.activity_preferences = fields.activityPreferences;
      if (fields.timeOfDayPattern !== undefined) dbFields.time_of_day_pattern = fields.timeOfDayPattern;
      if (fields.cuisinePreferences !== undefined) dbFields.cuisine_preferences = fields.cuisinePreferences;
      if (fields.avoidances !== undefined) dbFields.avoidances = fields.avoidances;
      if (fields.notificationSettings !== undefined) dbFields.notification_settings = fields.notificationSettings;
      if (fields.buddySettings !== undefined) dbFields.buddy_settings = fields.buddySettings;

      dbFields.last_updated = new Date().toISOString();

      await supabase
        .from("travel_profiles")
        .upsert({ user_id: user.id, ...dbFields }, { onConflict: "user_id" });
    },
    [user],
  );

  return { profile, travelProfile, loading, updateProfile, updateTravelProfile };
}
