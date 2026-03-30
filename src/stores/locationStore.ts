import { create } from "zustand";

export interface POI {
  id: string;
  name: string;
  category: string;
  distance: number; // meters
  address: string;
  buddyMessage: string;
  lat?: number;
  lng?: number;
}

interface LocationState {
  permission: "prompt" | "granted" | "denied";
  lat: number | null;
  lng: number | null;
  speed: number | null; // m/s, derived from consecutive positions
  previousPosition: { lat: number; lng: number; timestamp: number } | null;
  nearbyPOIs: POI[];
  pendingAlert: POI | null;
  alertHistory: string[]; // POI ids already shown
  quietMode: boolean;
  handsFreeMode: boolean;
  lastAlertTime: number;
  alertFrequency: number; // 1 (rare) to 5 (frequent)

  setPermission: (p: "prompt" | "granted" | "denied") => void;
  setPosition: (lat: number, lng: number) => void;
  setNearbyPOIs: (pois: POI[]) => void;
  setPendingAlert: (poi: POI | null) => void;
  dismissAlert: (poiId: string) => void;
  toggleQuietMode: () => void;
  toggleHandsFree: () => void;
  setAlertFrequency: (v: number) => void;
}

/** Haversine distance in meters */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useLocationStore = create<LocationState>((set, get) => ({
  permission: "prompt",
  lat: null,
  lng: null,
  speed: null,
  previousPosition: null,
  nearbyPOIs: [],
  pendingAlert: null,
  alertHistory: [],
  quietMode: false,
  handsFreeMode: false,
  lastAlertTime: 0,
  alertFrequency: 3,

  setPermission: (permission) => set({ permission }),
  setPosition: (lat, lng) => {
    const prev = get().previousPosition;
    let speed: number | null = null;
    if (prev) {
      const dist = haversineDistance(prev.lat, prev.lng, lat, lng);
      const dt = (Date.now() - prev.timestamp) / 1000; // seconds
      if (dt > 0) speed = dist / dt;
    }
    set({
      lat,
      lng,
      speed,
      previousPosition: { lat, lng, timestamp: Date.now() },
    });
  },
  setNearbyPOIs: (pois) => set({ nearbyPOIs: pois }),
  setPendingAlert: (poi) => set({ pendingAlert: poi, lastAlertTime: Date.now() }),
  dismissAlert: (poiId) =>
    set((s) => ({
      pendingAlert: null,
      alertHistory: [...s.alertHistory, poiId],
    })),
  toggleQuietMode: () => set((s) => ({ quietMode: !s.quietMode })),
  toggleHandsFree: () => set((s) => ({ handsFreeMode: !s.handsFreeMode })),
  setAlertFrequency: (v) => set({ alertFrequency: v }),
}));
