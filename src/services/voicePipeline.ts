// Voice pipeline: STT → ChatGPT → TTS with Buddy mood transitions

import { startListening, stopListening } from "./speech";
import { speak, stop as stopTTS } from "./tts";
import { callChatGPT } from "./chatgpt";
import { useVoiceStore } from "../stores/voiceStore";
import { useBuddyStore } from "../stores/buddyStore";

// Demo responses when no API key is configured
const demoResponses: Record<string, string> = {
  default:
    "I'd love to help you with that! Based on your travel style, I think we can find something really special. Want me to look into some options?",
  plan: "Great idea! I know you prefer quieter spots with local character. How about I sketch out a route that avoids the tourist crowds? I'll factor in your pace preference too.",
  budget:
    "You're doing well on your budget! You've spent a bit more on food than planned, but that's because you've been discovering incredible local restaurants. I'd say that's money well spent.",
  calendar:
    "Looking at your schedule, I notice you have a conflict tomorrow morning. I'd suggest moving the temple visit to the afternoon — the light is actually more beautiful then, and it'll be less crowded.",
  weather:
    "The forecast looks gorgeous for the next three days! Perfect for that hike we talked about. I'd recommend going tomorrow morning when it's coolest.",
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

async function getChatGPTResponse(transcript: string): Promise<string> {
  const systemPrompt =
    "You are OmniBuddy, a warm, emotionally intelligent travel companion. You're friendly, concise, and speak like a caring friend — not an AI assistant. Keep responses under 3 sentences.";

  const response = await callChatGPT(systemPrompt, transcript, 200);
  return response ?? getDemoResponse(transcript);
}

export function startVoiceSession(): void {
  const voice = useVoiceStore.getState();
  const buddy = useBuddyStore.getState();

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

        const response = await getChatGPTResponse(transcript);

        voice.setBuddyResponse(response);
        voice.setState("speaking");
        buddy.setMood("excited");

        await speak(response);

        voice.setState("idle");
        buddy.setMood("idle");
      }
    },
    (error) => {
      voice.setError(error);
      buddy.setMood("idle");
    }
  );
}

export function stopVoiceSession(): void {
  stopListening();
  stopTTS();
  useVoiceStore.getState().closeOverlay();
  useBuddyStore.getState().setMood("idle");
}
