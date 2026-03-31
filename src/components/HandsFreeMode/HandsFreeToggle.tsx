// Hands-free mode: screen dimmed, audio-only companion with continuous listening
// Wake Lock keeps the screen awake, mic stays open for voice commands

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLocationStore } from "../../stores/locationStore";
import { useProfileStore } from "../../stores/profileStore";
import { useBuddyStore } from "../../stores/buddyStore";
import { Buddy } from "../Buddy";
import { requestMicPermission, startListening, stopListening } from "../../services/speech";
import { speak } from "../../services/tts";
import { callChatGPT } from "../../services/chatgpt";
import { fetchNearbyPOIs } from "../../services/poi";
import {
  buildSystemPrompt,
  extractAction,
  actionToRoute,
  isNearbyAction,
  type BuddyTone,
  type PersonalityContext,
} from "../../services/buddyPersonality";
import type { UserHistory } from "../../hooks/useUserHistory";

type VoiceState = "waiting" | "listening" | "processing" | "speaking" | "mic-denied";

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
    currentScreen: "hands_free",
  };
}

interface HandsFreeToggleProps {
  history?: UserHistory | null;
}

export function HandsFreeToggle({ history }: HandsFreeToggleProps) {
  const { handsFreeMode, toggleHandsFree, pendingAlert } = useLocationStore();
  const setMood = useBuddyStore((s) => s.setMood);
  const profile = useProfileStore((s) => s.profile);
  const navigate = useNavigate();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [voiceState, setVoiceState] = useState<VoiceState>("waiting");
  const [transcript, setTranscript] = useState("");
  const [buddyResponse, setBuddyResponse] = useState("");

  // Counter that increments each time we need to restart listening
  const [listenCycle, setListenCycle] = useState(0);
  const [micAllowed, setMicAllowed] = useState(false);
  const activeRef = useRef(true); // tracks if hands-free is still on

  const buddyName = profile?.buddyName || "OmniBuddy";

  // Process a voice command: ChatGPT → TTS → restart listening
  const handleVoiceCommand = useCallback(async (text: string) => {
    setVoiceState("processing");
    setTranscript(text);
    setMood("thinking");

    const ctx = getPersonalityContext(history ?? null);
    const systemPrompt = buildSystemPrompt(ctx);
    const response = await callChatGPT(systemPrompt, text, 250);

    if (!response) {
      const fallback = "Sorry, I couldn't process that. Try again!";
      setBuddyResponse(fallback);
      setVoiceState("speaking");
      setMood("idle");
      await speak(fallback);
      if (activeRef.current) {
        setVoiceState("listening");
        setListenCycle((c) => c + 1); // trigger restart
      }
      return;
    }

    const { text: responseText, action } = extractAction(response);
    setBuddyResponse(responseText);
    setVoiceState("speaking");
    setMood("excited");

    await speak(responseText);

    // Handle action — may navigate away
    if (action) {
      if (isNearbyAction(action)) {
        // Stay in hands-free, POI search handled by alert engine
      } else {
        const route = actionToRoute(action);
        if (route) {
          toggleHandsFree();
          navigate(route);
          return; // don't restart listening — we're leaving
        }
      }
    }

    // Resume listening for next command
    if (activeRef.current) {
      setMood("idle");
      setVoiceState("listening");
      setListenCycle((c) => c + 1);
    }
  }, [history, setMood, navigate, toggleHandsFree]);

  // Acquire / release Wake Lock
  useEffect(() => {
    if (!handsFreeMode) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      return;
    }

    async function acquireWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        // Wake Lock not supported or denied
      }
    }

    acquireWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [handsFreeMode]);

  // Request mic permission when hands-free activates
  useEffect(() => {
    if (!handsFreeMode) {
      activeRef.current = false;
      setMicAllowed(false);
      setVoiceState("waiting");
      setTranscript("");
      setBuddyResponse("");
      setListenCycle(0);
      return;
    }

    activeRef.current = true;
    let cancelled = false;

    async function initMic() {
      const perm = await requestMicPermission();
      if (cancelled) return;
      if (perm === "denied") {
        setVoiceState("mic-denied");
        return;
      }

      // Fetch fresh nearby POIs if location is available and store is empty
      const loc = useLocationStore.getState();
      if (loc.lat && loc.lng && loc.permission === "granted" && loc.nearbyPOIs.length === 0) {
        fetchNearbyPOIs(loc.lat, loc.lng)
          .then((pois) => {
            if (!cancelled) loc.setNearbyPOIs(pois);
          })
          .catch(() => {});
      }

      setMicAllowed(true);
      setVoiceState("listening");
      setListenCycle(1); // kick off first listen
    }

    initMic();

    return () => {
      cancelled = true;
      activeRef.current = false;
      stopListening();
    };
  }, [handsFreeMode]);

  // Start listening whenever listenCycle changes (and mic is allowed)
  // Each cycle creates a fresh recognition instance — no stale closures
  useEffect(() => {
    if (!handsFreeMode || !micAllowed || listenCycle === 0) return;

    let handled = false;

    startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal && text.trim() && !handled) {
          handled = true;
          stopListening();
          handleVoiceCommand(text.trim());
        }
      },
      (err) => {
        console.warn("Hands-free speech error:", err);
        // On error, try to restart after a short delay
        if (activeRef.current && !handled) {
          setTimeout(() => {
            if (activeRef.current) {
              setListenCycle((c) => c + 1);
            }
          }, 1000);
        }
      },
      { continuous: true },
    );

    return () => {
      stopListening();
    };
  }, [listenCycle, handsFreeMode, micAllowed, handleVoiceCommand]);

  if (!handsFreeMode) return null;

  const buddyState = voiceState === "processing" ? "thinking"
    : voiceState === "speaking" ? "happy"
    : "idle";

  const statusText = voiceState === "mic-denied"
    ? "Microphone access denied. Please allow mic in browser settings."
    : voiceState === "listening"
    ? `${buddyName} is listening...`
    : voiceState === "processing"
    ? `${buddyName} is thinking...`
    : voiceState === "speaking"
    ? `${buddyName} is speaking...`
    : "Initializing voice...";

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center text-white">
      {/* Buddy avatar */}
      <div className="w-24 h-24 rounded-full overflow-hidden mb-6 ring-2 ring-primary/30">
        <Buddy state={buddyState} size="mini" mode="video" />
      </div>

      {/* Status */}
      <h2 className="text-lg font-semibold font-serif mb-1">Hands-Free Mode</h2>
      <p className="text-sm text-white/50 mb-4 text-center px-10">
        {statusText}
      </p>

      {/* Live transcript */}
      {transcript && (voiceState === "listening" || voiceState === "processing") && (
        <div className="bg-white/5 rounded-2xl px-5 py-3 mx-8 mb-4 text-center max-w-[340px]">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">You said</p>
          <p className="text-sm text-white/80 italic">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* Buddy response */}
      {buddyResponse && (voiceState === "speaking" || voiceState === "listening") && (
        <div className="bg-primary/10 rounded-2xl px-5 py-3 mx-8 mb-4 text-center max-w-[340px]">
          <p className="text-xs text-primary/60 uppercase tracking-wider mb-1">{buddyName}</p>
          <p className="text-sm text-white/90">{buddyResponse}</p>
        </div>
      )}

      {/* Audio waveform indicator */}
      <div className="flex items-end gap-1 h-10 mb-6">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-full ${voiceState === "listening" ? "bg-primary/60" : "bg-white/20"}`}
            style={{
              height: `${10 + Math.sin((Date.now() / 400 + i) * 0.8) * 15 + 15}px`,
              animation: voiceState === "listening"
                ? `pulse 1.2s ease-in-out ${i * 0.15}s infinite alternate`
                : "none",
            }}
          />
        ))}
      </div>

      {/* Last alert info */}
      {pendingAlert && !buddyResponse && (
        <div className="bg-white/10 rounded-2xl px-5 py-3 mx-8 mb-6 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Last Discovery</p>
          <p className="text-sm text-white/80">{pendingAlert.name}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {pendingAlert.distance}m &middot; {pendingAlert.category}
          </p>
        </div>
      )}

      {/* Headphones hint */}
      <div className="flex items-center gap-2 mb-10">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/30"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
        <span className="text-xs text-white/30">Headphones recommended</span>
      </div>

      {/* Stop button */}
      <button
        type="button"
        onClick={toggleHandsFree}
        className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        aria-label="Exit hands-free mode"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <p className="text-xs text-white/30 mt-3">Tap to exit</p>

      <style>{`
        @keyframes pulse {
          from { transform: scaleY(0.6); }
          to { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}
