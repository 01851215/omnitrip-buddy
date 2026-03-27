import { create } from "zustand";
import type { BuddyMood, BuddyPosition } from "../types";
import type { ReactNode } from "react";

interface BuddyState {
  mood: BuddyMood;
  position: BuddyPosition;
  isOverlayOpen: boolean;
  overlayContent: ReactNode | null;
  speechText: string | null;
}

interface BuddyActions {
  setMood: (mood: BuddyMood) => void;
  setPosition: (position: BuddyPosition) => void;
  showOverlay: (content: ReactNode) => void;
  hideOverlay: () => void;
  setSpeechText: (text: string | null) => void;
}

export const useBuddyStore = create<BuddyState & BuddyActions>((set) => ({
  mood: "idle",
  position: "center",
  isOverlayOpen: false,
  overlayContent: null,
  speechText: null,

  setMood: (mood) => set({ mood }),
  setPosition: (position) => set({ position }),
  showOverlay: (content) => set({ isOverlayOpen: true, overlayContent: content }),
  hideOverlay: () => set({ isOverlayOpen: false, overlayContent: null }),
  setSpeechText: (text) => set({ speechText: text }),
}));
