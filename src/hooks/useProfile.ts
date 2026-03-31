import { useEffect, useRef } from "react";
import { useAuthContext } from "../components/auth/AuthProvider";
import { useProfileStore } from "../stores/profileStore";
import type { Profile, TravelProfile } from "../stores/profileStore";

export type { Profile, TravelProfile };

export function useProfile() {
  const { user } = useAuthContext();
  const profile = useProfileStore((s) => s.profile);
  const travelProfile = useProfileStore((s) => s.travelProfile);
  const loading = useProfileStore((s) => s.loading);
  const fetch = useProfileStore((s) => s.fetch);
  const clear = useProfileStore((s) => s.clear);
  const saveProfile = useProfileStore((s) => s.saveProfile);
  const saveTravelProfile = useProfileStore((s) => s.saveTravelProfile);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId) {
      fetch(userId);
      prevUserIdRef.current = userId;
    } else if (prevUserIdRef.current !== null) {
      // Only clear when transitioning from a real user to no user (actual logout),
      // not on transient null from auth token refresh.
      prevUserIdRef.current = null;
      clear();
    }
  }, [user?.id, fetch, clear]);

  return {
    profile,
    travelProfile,
    loading,
    updateProfile: (fields: Partial<Profile>) =>
      user ? saveProfile(user.id, fields) : Promise.resolve(false),
    updateTravelProfile: (fields: Partial<TravelProfile>) =>
      user ? saveTravelProfile(user.id, fields) : Promise.resolve(false),
  };
}
