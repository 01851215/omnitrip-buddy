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
    email: (row.email as string) ?? "",
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
  // budget_style is jsonb in DB — extract string value
  const rawBudget = row.budget_style;
  const budgetStyle =
    typeof rawBudget === "string"
      ? rawBudget
      : rawBudget && typeof rawBudget === "object" && "value" in (rawBudget as Record<string, unknown>)
      ? String((rawBudget as Record<string, unknown>).value)
      : "moderate";

  // notification_settings is jsonb
  const rawNotif = (row.notification_settings as Record<string, unknown>) ?? {};

  return {
    userId: row.user_id as string,
    pacePreference: (row.pace_preference as number) ?? 3,
    budgetStyle,
    activityPreferences: (row.activity_preferences as string[]) ?? [],
    timeOfDayPattern: (row.time_of_day_pattern as string) ?? "",
    cuisinePreferences: (row.cuisine_preferences as string[]) ?? [],
    avoidances: (row.avoidances as string[]) ?? [],
    notificationSettings: rawNotif,
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
    return () => {
      cancelled = true;
    };
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

      if (Object.keys(dbFields).length === 0) return;

      dbFields.updated_at = new Date().toISOString();

      // Upsert handles both missing rows (new users) and existing rows
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...dbFields }, { onConflict: "id" });

      if (error) {
        console.error("Failed to update profile:", error);
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) setProfile(rowToProfile(data));
      }
    },
    [user],
  );

  const updateTravelProfile = useCallback(
    async (fields: Partial<TravelProfile>) => {
      if (!user) return;

      // Optimistic update
      setTravelProfile((prev) => (prev ? { ...prev, ...fields } : prev));

      const dbFields: Record<string, unknown> = {};
      if (fields.pacePreference !== undefined) dbFields.pace_preference = fields.pacePreference;
      // budget_style column is jsonb — wrap string in JSON
      if (fields.budgetStyle !== undefined) dbFields.budget_style = JSON.stringify(fields.budgetStyle);
      if (fields.activityPreferences !== undefined) dbFields.activity_preferences = JSON.stringify(fields.activityPreferences);
      if (fields.timeOfDayPattern !== undefined) dbFields.time_of_day_pattern = fields.timeOfDayPattern;
      if (fields.cuisinePreferences !== undefined) dbFields.cuisine_preferences = fields.cuisinePreferences;
      if (fields.avoidances !== undefined) dbFields.avoidances = fields.avoidances;
      if (fields.notificationSettings !== undefined) dbFields.notification_settings = fields.notificationSettings;
      if (fields.buddySettings !== undefined) dbFields.buddy_settings = fields.buddySettings;

      if (Object.keys(dbFields).length === 0) return;

      dbFields.last_updated = new Date().toISOString();

      // Try update first, fall back to upsert if row doesn't exist yet
      const { error } = await supabase
        .from("travel_profiles")
        .update(dbFields)
        .eq("user_id", user.id);

      if (error) {
        // Row might not exist — try upsert
        const { error: upsertErr } = await supabase
          .from("travel_profiles")
          .upsert({ user_id: user.id, ...dbFields }, { onConflict: "user_id" });

        if (upsertErr) {
          console.error("Failed to update travel profile:", upsertErr);
          // Revert
          const { data } = await supabase.from("travel_profiles").select("*").eq("user_id", user.id).single();
          if (data) setTravelProfile(rowToTravelProfile(data));
        }
      }
    },
    [user],
  );

  return { profile, travelProfile, loading, updateProfile, updateTravelProfile };
}
