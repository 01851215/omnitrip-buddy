// Hands-free mode: screen dimmed, audio-only companion
// Wake Lock keeps the screen awake but content is minimal

import { useEffect, useRef } from "react";
import { useLocationStore } from "../../stores/locationStore";
import { Buddy } from "../Buddy";

export function HandsFreeToggle() {
  const { handsFreeMode, toggleHandsFree, pendingAlert } = useLocationStore();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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

  if (!handsFreeMode) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center text-white">
      {/* Buddy avatar */}
      <div className="w-24 h-24 rounded-full overflow-hidden mb-6 ring-2 ring-primary/30">
        <Buddy state="idle" size="mini" mode="video" />
      </div>

      {/* Status */}
      <h2 className="text-lg font-semibold font-serif mb-1">Hands-Free Mode</h2>
      <p className="text-sm text-white/50 mb-8 text-center px-10">
        Screen dimmed — Buddy will narrate nearby discoveries aloud.
      </p>

      {/* Audio waveform indicator */}
      <div className="flex items-end gap-1 h-10 mb-8">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-primary/60"
            style={{
              height: `${10 + Math.sin((Date.now() / 400 + i) * 0.8) * 15 + 15}px`,
              animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Last alert info */}
      {pendingAlert && (
        <div className="bg-white/10 rounded-2xl px-5 py-3 mx-8 mb-8 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
            Last Discovery
          </p>
          <p className="text-sm text-white/80">{pendingAlert.name}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {pendingAlert.distance}m · {pendingAlert.category}
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
