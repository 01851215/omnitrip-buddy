import { create } from "zustand";
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
  const rawBudget = row.budget_style;
  const budgetStyle =
    typeof rawBudget === "string"
      ? rawBudget
      : rawBudget && typeof rawBudget === "object" && "value" in (rawBudget as Record<string, unknown>)
      ? String((rawBudget as Record<string, unknown>).value)
      : "moderate";

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

interface ProfileStore {
  profile: Profile | null;
  travelProfile: TravelProfile | null;
  loaded: boolean;
  loading: boolean;
  fetchedForUser: string | null;

  fetch: (userId: string, force?: boolean) => Promise<void>;
  setProfile: (p: Profile) => void;
  setTravelProfile: (tp: TravelProfile) => void;

  saveProfile: (userId: string, fields: Partial<Profile>) => Promise<boolean>;
  saveTravelProfile: (userId: string, fields: Partial<TravelProfile>) => Promise<boolean>;
  clear: () => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  travelProfile: null,
  loaded: false,
  loading: false,
  fetchedForUser: null,

  fetch: async (userId: string, force?: boolean) => {
    if (!force && get().fetchedForUser === userId && get().loaded) return;
    set({ loading: true });

    const [profileRes, travelRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("travel_profiles").select("*").eq("user_id", userId).single(),
    ]);

    set({
      profile: profileRes.data ? rowToProfile(profileRes.data) : null,
      travelProfile: travelRes.data ? rowToTravelProfile(travelRes.data) : null,
      loaded: true,
      loading: false,
      fetchedForUser: userId,
    });
  },

  setProfile: (p) => set({ profile: p }),
  setTravelProfile: (tp) => set({ travelProfile: tp }),

  saveProfile: async (userId, fields) => {
    const prev = get().profile;
    set({ profile: prev ? { ...prev, ...fields } : prev });

    const dbFields: Record<string, unknown> = {};
    if (fields.displayName !== undefined) dbFields.display_name = fields.displayName;
    if (fields.username !== undefined) dbFields.username = fields.username;
    if (fields.buddyName !== undefined) dbFields.buddy_name = fields.buddyName;
    if (fields.age !== undefined) dbFields.age = fields.age;
    if (fields.bio !== undefined) dbFields.bio = fields.bio;
    if (fields.avatarUrl !== undefined) dbFields.avatar_url = fields.avatarUrl;

    if (Object.keys(dbFields).length === 0) return true;

    const { error } = await supabase
      .from("profiles")
      .update(dbFields)
      .eq("id", userId);

    if (error) {
      console.error("Failed to save profile:", error);
      if (prev) set({ profile: prev });
      return false;
    }
    return true;
  },

  saveTravelProfile: async (userId, fields) => {
    const prev = get().travelProfile;
    const merged = prev ? { ...prev, ...fields } : { ...fields, userId } as TravelProfile;
    set({ travelProfile: merged });

    const dbFields: Record<string, unknown> = {};
    if (fields.pacePreference !== undefined) dbFields.pace_preference = fields.pacePreference;
    if (fields.budgetStyle !== undefined) dbFields.budget_style = fields.budgetStyle;
    if (fields.activityPreferences !== undefined) dbFields.activity_preferences = fields.activityPreferences;
    if (fields.timeOfDayPattern !== undefined) dbFields.time_of_day_pattern = fields.timeOfDayPattern;
    if (fields.cuisinePreferences !== undefined) dbFields.cuisine_preferences = fields.cuisinePreferences;
    if (fields.avoidances !== undefined) dbFields.avoidances = fields.avoidances;
    if (fields.notificationSettings !== undefined) dbFields.notification_settings = fields.notificationSettings;
    if (fields.buddySettings !== undefined) dbFields.buddy_settings = fields.buddySettings;

    if (Object.keys(dbFields).length === 0) return true;
    dbFields.last_updated = new Date().toISOString();

    const { error } = await supabase
      .from("travel_profiles")
      .upsert({ user_id: userId, ...dbFields }, { onConflict: "user_id" });

    if (error) {
      console.error("Failed to save travel profile:", error);
      if (prev) set({ travelProfile: prev });
      return false;
    }
    return true;
  },

  clear: () => set({ profile: null, travelProfile: null, loaded: false, loading: false, fetchedForUser: null }),
}));
