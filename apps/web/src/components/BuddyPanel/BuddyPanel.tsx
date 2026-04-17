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
import { callChatGPTWithHistory } from "../../services/chatgpt";
import type { ChatMsg } from "../../services/chatgpt";
import {
  buildSystemPrompt,
  extractAction,
  actionToRoute,
  isNearbyAction,
  type BuddyTone,
  type PersonalityContext,
} from "../../services/buddyPersonality";
import type { UserHistory } from "../../hooks/useUserHistory";
import { useSettingsStore } from "../../stores/settingsStore";
import { fetchRoute, guessTransportMode } from "../../services/routing";

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
  chatHistory: { role: "user" | "buddy"; text: string }[],
): Promise<{ text: string; action: string | null; route: import("../../services/buddyPersonality").RouteWaypoint[] | null }> {
  const ctx = getPersonalityContext(history);
  const systemPrompt = buildSystemPrompt(ctx);

  // Build full message array with conversation history
  const messages: ChatMsg[] = [{ role: "system", content: systemPrompt }];

  // Include recent chat history (last 20 messages to keep context window reasonable)
  const recent = chatHistory.slice(-20);
  for (const msg of recent) {
    messages.push({
      role: msg.role === "buddy" ? "assistant" : "user",
      content: msg.text,
    });
  }

  // Add the new user message
  messages.push({ role: "user", content: text });

  // Use more tokens for prompts that need structured output
  const isBudgetAnalysis = text.includes("SPENDING BY CATEGORY") || text.includes("Analyze my travel budget");
  const isDirectionQuery = /\b(direction|route|how.*(get|go)|navigate|way to)\b/i.test(text);
  const maxTokens = isBudgetAnalysis ? 350 : isDirectionQuery ? 400 : 250;

  const response = await callChatGPTWithHistory(messages, maxTokens);
  if (!response) return { text: getDemoResponse(text), action: null, route: null };

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
  const voiceRecitation = useSettingsStore((s) => s.voiceRecitation);
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

    // Pass current messages so GPT has full conversation context
    const currentMessages = useBuddyPanelStore.getState().messages;
    const { text: responseText, action, route } = await getResponse(text, history ?? null, currentMessages);

    const msgId = `buddy-${Date.now()}`;

    // If GPT returned waypoints, fetch real road-following route from OSRM
    if (route && route.length >= 2) {
      const userPreferredMode = guessTransportMode(text);
      const waypoints = route.map((w) => ({ lat: w.lat, lng: w.lng, label: w.label }));

      // Add message immediately with waypoints (map shows loading state)
      addMessage({
        id: msgId,
        role: "buddy",
        text: responseText,
        timestamp: Date.now(),
        route: { waypoints },
      });

      // Fetch real route geometry in background, then update the message
      fetchRoute(route).then((result) => {
        if (result) {
          const mode = userPreferredMode ?? result.recommendedMode;
          const { messages: msgs } = useBuddyPanelStore.getState();
          const updated = msgs.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  route: {
                    ...m.route!,
                    geometry: result.geometry,
                    summary: result.summaries[mode],
                    mode,
                    allSummaries: result.summaries,
                    recommendedMode: result.recommendedMode,
                  },
                }
              : m,
          );
          useBuddyPanelStore.setState({ messages: updated });
        }
      });
    } else {
      addMessage({
        id: msgId,
        role: "buddy",
        text: responseText,
        timestamp: Date.now(),
      });
    }

    setProcessing(false);
    setMood("idle");

    // TTS — only if recitation is enabled in settings
    if (voiceRecitation) speak(responseText).catch(() => {});

    // Handle LLM-extracted action
    if (action) {
      if (isNearbyAction(action)) {
        // POI search actions stay in panel — could trigger a location search
      } else {
        const navRoute = actionToRoute(action);
        if (navRoute) {
          setMood("excited");
          setTimeout(() => {
            close();
            navigate(navRoute);
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
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") close(); }}
        className="relative bg-surface rounded-t-3xl w-full max-w-[430px] flex flex-col animate-slide-up"
        style={{ height: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-cream-dark">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-cream-dark flex items-center justify-center">
            <Buddy state={isProcessing ? "thinking" : "happy"} size="mini" mode="video" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{buddyName}</p>
            <p className="text-[10px] text-text-muted">
              <span aria-live="polite">
                {isProcessing ? "Thinking..." : isListening ? "Listening..." : "Your travel companion"}
              </span>
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
