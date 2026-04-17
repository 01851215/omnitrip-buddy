// Voice pipeline: STT → ChatGPT → TTS with personality-adapted Buddy

import { startListening, stopListening, requestMicPermission } from "./speech";
import { speak, stop as stopTTS } from "./tts";
import { callChatGPT } from "./chatgpt";
import { useVoiceStore } from "../stores/voiceStore";
import { useBuddyStore } from "../stores/buddyStore";
import { useLocationStore } from "../stores/locationStore";
import { useProfileStore } from "../stores/profileStore";
import {
  buildSystemPrompt,
  extractAction,
  actionToRoute,
  isNearbyAction,
  type PersonalityContext,
  type BuddyTone,
} from "./buddyPersonality";
import type { UserHistory } from "../hooks/useUserHistory";

// Demo responses when no API key is configured
const demoResponses: Record<string, string> = {
  default:
    "I'd love to help you with that! Based on your travel style, I think we can find something really special. Want me to look into some options?",
  plan: "Great idea! I know you prefer quieter spots with local character. How about I sketch out a route that avoids the tourist crowds?",
  budget:
    "You're doing well on your budget! You've spent a bit more on food than planned, but those local restaurants were worth it.",
  calendar:
    "Looking at your schedule, I notice you have a conflict tomorrow morning. I'd suggest moving the temple visit to the afternoon.",
  weather:
    "The forecast looks gorgeous for the next three days! Perfect for that hike we talked about.",
};

function getDemoResponse(transcript: string): string {
  const lower = transcript.toLowerCase();
  if (lower.includes("plan") || lower.includes("trip") || lower.includes("route"))
    return demoResponses.plan;
  if (lower.includes("budget") || lower.includes("money") || lower.includes("spend"))
    return demoResponses.budget;
  if (lower.includes("calendar") || lower.includes("schedule") || lower.includes("conflict"))
    return demoResponses.calendar;
  if (lower.includes("weather") || lower.includes("forecast"))
    return demoResponses.weather;
  return demoResponses.default;
}

/** Build personality context from current stores */
function getPersonalityContext(history: UserHistory | null): PersonalityContext {
  const profile = useProfileStore.getState().profile;
  const travelProfile = useProfileStore.getState().travelProfile;
  const loc = useLocationStore.getState();

  const buddySettings = travelProfile?.buddySettings ?? {};
  const tone = (buddySettings as Record<string, string>).tone as BuddyTone | undefined;

  return {
    buddyName: profile?.buddyName || "OmniBuddy",
    tone: tone ?? "warm",
    history,
    locationContext: loc.lat && loc.lng ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : undefined,
  };
}

async function getChatGPTResponse(
  transcript: string,
  history: UserHistory | null,
): Promise<{ text: string; action: string | null }> {
  const ctx = getPersonalityContext(history);
  const systemPrompt = buildSystemPrompt(ctx);

  const response = await callChatGPT(systemPrompt, transcript, 250);
  if (!response) return { text: getDemoResponse(transcript), action: null };

  return extractAction(response);
}

/** Navigation callback — set by the component that starts the session */
let onNavigate: ((route: string) => void) | null = null;
let onNearbySearch: ((action: string) => void) | null = null;

export interface VoiceSessionOptions {
  history?: UserHistory | null;
  onNavigate?: (route: string) => void;
  onNearbySearch?: (action: string) => void;
}

export async function startVoiceSession(options?: VoiceSessionOptions): Promise<void> {
  const voice = useVoiceStore.getState();
  const buddy = useBuddyStore.getState();

  onNavigate = options?.onNavigate ?? null;
  onNearbySearch = options?.onNearbySearch ?? null;

  // Request mic permission first
  const perm = await requestMicPermission();
  if (perm === "denied") {
    voice.setError("Microphone access denied. Please allow microphone in browser settings.");
    return;
  }

  voice.reset();
  voice.openOverlay();
  voice.setState("listening");
  buddy.setMood("idle");

  startListening(
    async (transcript, isFinal) => {
      voice.setTranscript(transcript);

      if (isFinal) {
        stopListening();
        voice.setState("processing");
        buddy.setMood("thinking");

        const { text, action } = await getChatGPTResponse(
          transcript,
          options?.history ?? null,
        );

        voice.setBuddyResponse(text);
        voice.setState("speaking");
        buddy.setMood("excited");

        await speak(text);

        // Handle extracted action
        if (action) {
          if (isNearbyAction(action) && onNearbySearch) {
            onNearbySearch(action);
          } else {
            const route = actionToRoute(action);
            if (route && onNavigate) {
              onNavigate(route);
            }
          }
        }

        voice.setState("idle");
        buddy.setMood("idle");
      }
    },
    (error) => {
      voice.setError(error);
      buddy.setMood("idle");
    },
  );
}

export function stopVoiceSession(): void {
  stopListening();
  stopTTS();
  onNavigate = null;
  onNearbySearch = null;
  useVoiceStore.getState().closeOverlay();
  useBuddyStore.getState().setMood("idle");
}
