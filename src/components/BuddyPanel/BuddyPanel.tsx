import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBuddyPanelStore } from "../../stores/buddyPanelStore";
import { useLocationStore } from "../../stores/locationStore";
import { useBuddyStore } from "../../stores/buddyStore";
import { useProfileStore } from "../../stores/profileStore";
import { Buddy } from "../Buddy";
import { ChatFeed } from "./ChatFeed";
import { POIFeed } from "./POIFeed";
import { QuickActions } from "./QuickActions";
import { PanelInput } from "./PanelInput";
import { startListening, stopListening, requestMicPermission } from "../../services/speech";
import { speak } from "../../services/tts";
import { callChatGPT } from "../../services/chatgpt";
import {
  buildSystemPrompt,
  extractAction,
  actionToRoute,
  isNearbyAction,
  type BuddyTone,
  type PersonalityContext,
} from "../../services/buddyPersonality";
import type { UserHistory } from "../../hooks/useUserHistory";

const demoResponses: Record<string, string> = {
  default:
    "I'd love to help with that! Based on your travel style, I think we can find something really special.",
  "Food nearby":
    "There's an amazing warung just 180m away — Ibu Oka is legendary for roast suckling pig. Perfect for your love of authentic local food!",
  "Things to do":
    "The Campuhan Ridge Walk is nearby — a beautiful hillside path between two valleys. Great for a slow-paced morning stroll!",
  "Hidden gems":
    "I know a quiet little cafe overlooking the rice terraces, just 320m away. Most tourists miss it completely!",
  "Check budget":
    "You're slightly over on food, but well on track for stays. Overall you're at 68% of your planned budget with 40% of your trip left.",
  "What's next?":
    "You have a temple visit planned this afternoon at 2pm. The light is beautiful then and it'll be less crowded!",
};

function getDemoResponse(text: string): string {
  if (demoResponses[text]) return demoResponses[text];
  const lower = text.toLowerCase();
  if (lower.includes("food") || lower.includes("eat") || lower.includes("restaurant"))
    return demoResponses["Food nearby"];
  if (lower.includes("budget") || lower.includes("money") || lower.includes("spend"))
    return demoResponses["Check budget"];
  if (lower.includes("next") || lower.includes("schedule") || lower.includes("plan"))
    return demoResponses["What's next?"];
  return demoResponses.default;
}

function getPersonalityContext(history: UserHistory | null): PersonalityContext {
  const profile = useProfileStore.getState().profile;
  const travelProfile = useProfileStore.getState().travelProfile;
  const loc = useLocationStore.getState();

  const buddySettings = travelProfile?.buddySettings ?? {};
  const tone = (buddySettings as Record<string, string>).tone as BuddyTone | undefined;

  // Filter out demo POIs (prefixed with "demo-") — they're hardcoded Bali data
  const realPOIs = loc.nearbyPOIs.filter((p) => !p.id.startsWith("demo-"));

  return {
    buddyName: profile?.buddyName || "OmniBuddy",
    tone: tone ?? "warm",
    history,
    locationContext: loc.locationName ?? (loc.lat && loc.lng ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : undefined),
    nearbyPOIs: realPOIs.length > 0 ? realPOIs : undefined,
    movingSpeed: loc.speed,
    currentScreen: "buddy_panel",
  };
}

async function getResponse(
  text: string,
  history: UserHistory | null,
): Promise<{ text: string; action: string | null }> {
  const ctx = getPersonalityContext(history);
  const systemPrompt = buildSystemPrompt(ctx);

  const response = await callChatGPT(systemPrompt, text, 250);
  if (!response) return { text: getDemoResponse(text), action: null };

  return extractAction(response);
}

interface BuddyPanelProps {
  history?: UserHistory | null;
}

export function BuddyPanel({ history }: BuddyPanelProps) {
  const { isOpen, messages, isProcessing, isListening, pendingMessage, close, addMessage, setProcessing, setListening, clearPendingMessage } =
    useBuddyPanelStore();
  const nearbyPOIs = useLocationStore((s) => s.nearbyPOIs);
  const setMood = useBuddyStore((s) => s.setMood);
  const profile = useProfileStore((s) => s.profile);
  const navigate = useNavigate();
  const feedRef = useRef<HTMLDivElement>(null);

  const buddyName = profile?.buddyName || "OmniBuddy";

  // Auto-scroll chat on new message
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-send pending message (e.g. "Tell me more" from Buddy Reflection)
  useEffect(() => {
    if (isOpen && pendingMessage) {
      clearPendingMessage();
      handleSend(pendingMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pendingMessage]);

  const handleSend = async (text: string) => {
    addMessage({
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    });

    setProcessing(true);
    setMood("thinking");

    const { text: responseText, action } = await getResponse(text, history ?? null);

    addMessage({
      id: `buddy-${Date.now()}`,
      role: "buddy",
      text: responseText,
      timestamp: Date.now(),
    });

    setProcessing(false);
    setMood("idle");

    // TTS
    speak(responseText).catch(() => {});

    // Handle LLM-extracted action
    if (action) {
      if (isNearbyAction(action)) {
        // POI search actions stay in panel — could trigger a location search
      } else {
        const route = actionToRoute(action);
        if (route) {
          setMood("excited");
          setTimeout(() => {
            close();
            navigate(route);
            setMood("idle");
          }, 800);
        }
      }
    }
  };

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      setListening(false);
      return;
    }

    // Request mic permission before starting
    const perm = await requestMicPermission();
    if (perm === "denied") {
      addMessage({
        id: `buddy-${Date.now()}`,
        role: "buddy",
        text: "I need microphone access to listen. Please allow microphone permission in your browser settings.",
        timestamp: Date.now(),
      });
      return;
    }

    setListening(true);
    startListening(
      async (transcript, isFinal) => {
        if (isFinal) {
          stopListening();
          setListening(false);
          await handleSend(transcript);
        }
      },
      () => {
        setListening(false);
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-surface rounded-t-3xl w-full max-w-[430px] flex flex-col animate-slide-up" style={{ height: "85vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-cream-dark">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-cream-dark flex items-center justify-center">
            <Buddy state={isProcessing ? "thinking" : "happy"} size="mini" mode="video" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{buddyName}</p>
            <p className="text-[10px] text-text-muted">
              {isProcessing ? "Thinking..." : isListening ? "Listening..." : "Your travel companion"}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center text-text-muted"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Chat Feed */}
        <div ref={feedRef} className="flex-1 overflow-y-auto">
          <ChatFeed messages={messages} />
        </div>

        {/* POI Feed */}
        <POIFeed pois={nearbyPOIs} />

        {/* Quick Actions */}
        <QuickActions onAction={handleSend} />

        {/* Input */}
        <PanelInput
          onSend={handleSend}
          onMicToggle={handleMicToggle}
          isListening={isListening}
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}
