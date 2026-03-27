import { create } from "zustand";
import type { Trip } from "../types";
import { db } from "../db";

interface TripState {
  activeTrip: Trip | null;
  loading: boolean;
}

interface TripActions {
  loadActiveTrip: () => Promise<void>;
  setActiveTrip: (trip: Trip | null) => void;
}

export const useTripStore = create<TripState & TripActions>((set) => ({
  activeTrip: null,
  loading: false,

  loadActiveTrip: async () => {
    set({ loading: true });
    const trip = await db.trips.where("status").equals("active").first();
    set({ activeTrip: trip ?? null, loading: false });
  },

  setActiveTrip: (trip) => set({ activeTrip: trip }),
}));
