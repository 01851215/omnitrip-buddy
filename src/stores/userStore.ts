import { create } from "zustand";
import type { User } from "../types";
import { db } from "../db";

interface UserState {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
}

interface UserActions {
  loadUser: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useUserStore = create<UserState & UserActions>((set) => ({
  user: null,
  isGuest: true,
  loading: false,

  loadUser: async () => {
    set({ loading: true });
    const user = await db.users.toCollection().first();
    set({ user: user ?? null, isGuest: !user, loading: false });
  },

  loginAsGuest: async () => {
    const guest: User = {
      id: `guest-${Date.now()}`,
      displayName: "Traveller",
      createdAt: Date.now(),
    };
    await db.users.add(guest);
    set({ user: guest, isGuest: true });
  },

  setUser: (user) => set({ user, isGuest: false }),
}));
