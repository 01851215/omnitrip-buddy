import { useEffect, useRef } from "react";
import { useBuddyPanelStore } from "../../stores/buddyPanelStore";
import { useLocationStore } from "../../stores/locationStore";
import { useBuddyStore } from "../../stores/buddyStore";
import { Buddy } from "../Buddy";
import { ChatFeed } from "./ChatFeed";
import { POIFeed } from "./POIFeed";
import { QuickActions } from "./QuickActions";
import { PanelInput } from "./PanelInput";
import { startListening, stopListening } from "../../services/speech";
import { speak } from "../../services/tts";
import { callChatGPT } from "../../services/chatgpt";

const demoResponses: Record<string, string> = {
  default:
    "I'd love to help with that! Based on your travel style, I think we can find something really special.",
  "Food nearby":
    "There's an amazing warung just 180m away — Ibu Oka is legendary for roast suckling pig. Perfect for your love of authentic local food!",
  "Things to do":
    "The Campuhan Ridge Walk is nearby — a beautiful hillside path between two valleys. Great for a slow-paced morning stroll!",
  "Hidden gems":
    "I know a quiet little café overlooking the rice terraces, just 320m away. Most tourists miss it completely!",
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

async function getResponse(text: string): Promise<string> {
  const systemPrompt =
    "You are OmniBuddy, a warm, emotionally intelligent travel companion. You're friendly, concise, and speak like a caring friend. Keep responses under 3 sentences.";

  const response = await callChatGPT(systemPrompt, text, 200);
  return response ?? getDemoResponse(text);
}

export function BuddyPanel() {
  const { isOpen, messages, isProcessing, isListening, close, addMessage, setProcessing, setListening } =
    useBuddyPanelStore();
  const nearbyPOIs = useLocationStore((s) => s.nearbyPOIs);
  const setMood = useBuddyStore((s) => s.setMood);
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat on new message
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    addMessage({
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    });

    setProcessing(true);
    setMood("thinking");

    const response = await getResponse(text);

    addMessage({
      id: `buddy-${Date.now()}`,
      role: "buddy",
      text: response,
      timestamp: Date.now(),
    });

    setProcessing(false);
    setMood("idle");

    // TTS
    speak(response).catch(() => {});
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      setListening(false);
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
      }
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
            <p className="text-sm font-semibold">OmniBuddy</p>
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
