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
  pendingMessage: string | null; // message to auto-send when panel opens

  open: () => void;
  close: () => void;
  addMessage: (msg: ChatMessage) => void;
  setNearbyPOIs: (pois: POI[]) => void;
  setProcessing: (v: boolean) => void;
  setListening: (v: boolean) => void;
  clearMessages: () => void;
  openWithMessage: (text: string) => void;
  clearPendingMessage: () => void;
}

export const useBuddyPanelStore = create<BuddyPanelState>((set) => ({
  isOpen: false,
  messages: [],
  nearbyPOIs: [],
  isProcessing: false,
  isListening: false,
  pendingMessage: null,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, isListening: false }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setNearbyPOIs: (pois) => set({ nearbyPOIs: pois }),
  setProcessing: (v) => set({ isProcessing: v }),
  setListening: (v) => set({ isListening: v }),
  clearMessages: () => set({ messages: [] }),
  openWithMessage: (text) => set({ isOpen: true, pendingMessage: text }),
  clearPendingMessage: () => set({ pendingMessage: null }),
}));
