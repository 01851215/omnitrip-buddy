import { create } from "zustand";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface VoiceStore {
  state: VoiceState;
  transcript: string;
  buddyResponse: string | null;
  isOverlayOpen: boolean;
  error: string | null;

  setState: (state: VoiceState) => void;
  setTranscript: (text: string) => void;
  setBuddyResponse: (text: string | null) => void;
  openOverlay: () => void;
  closeOverlay: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  state: "idle",
  transcript: "",
  buddyResponse: null,
  isOverlayOpen: false,
  error: null,

  setState: (state) => set({ state }),
  setTranscript: (text) => set({ transcript: text }),
  setBuddyResponse: (text) => set({ buddyResponse: text }),
  openOverlay: () => set({ isOverlayOpen: true }),
  closeOverlay: () => set({ isOverlayOpen: false, state: "idle", transcript: "", buddyResponse: null, error: null }),
  setError: (error) => set({ error, state: "idle" }),
  reset: () => set({ state: "idle", transcript: "", buddyResponse: null, error: null }),
}));
