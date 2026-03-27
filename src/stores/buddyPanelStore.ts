import { create } from "zustand";
import type { POI } from "./locationStore";

export interface ChatMessage {
  id: string;
  role: "user" | "buddy";
  text: string;
  timestamp: number;
}

interface BuddyPanelState {
  isOpen: boolean;
  messages: ChatMessage[];
  nearbyPOIs: POI[];
  isProcessing: boolean;
  isListening: boolean;

  open: () => void;
  close: () => void;
  addMessage: (msg: ChatMessage) => void;
  setNearbyPOIs: (pois: POI[]) => void;
  setProcessing: (v: boolean) => void;
  setListening: (v: boolean) => void;
  clearMessages: () => void;
}

export const useBuddyPanelStore = create<BuddyPanelState>((set) => ({
  isOpen: false,
  messages: [],
  nearbyPOIs: [],
  isProcessing: false,
  isListening: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, isListening: false }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setNearbyPOIs: (pois) => set({ nearbyPOIs: pois }),
  setProcessing: (v) => set({ isProcessing: v }),
  setListening: (v) => set({ isListening: v }),
  clearMessages: () => set({ messages: [] }),
}));
