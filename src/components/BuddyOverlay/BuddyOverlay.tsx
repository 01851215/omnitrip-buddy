import { useEffect } from "react";
import { useBuddyStore } from "../../stores/buddyStore";
import { Buddy } from "../Buddy";

export function BuddyOverlay() {
  const { isOverlayOpen, overlayContent, speechText, hideOverlay, mood } =
    useBuddyStore();

  // Close on Escape
  useEffect(() => {
    if (!isOverlayOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideOverlay();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOverlayOpen, hideOverlay]);

  const moodToState = { idle: "idle", thinking: "thinking", excited: "happy" } as const;
  const state = moodToState[mood] ?? "idle";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          isOverlayOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={hideOverlay}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto transition-transform duration-300 ease-out ${
          isOverlayOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-buddy-overlay backdrop-blur-xl rounded-t-3xl shadow-2xl px-6 pt-4 pb-8 min-h-[280px]">
          {/* Buddy avatar at top */}
          <div className="flex justify-center -mt-12 mb-3">
            <div className="w-16 h-16 rounded-full bg-surface shadow-md border border-cream-dark overflow-hidden flex items-center justify-center">
              <Buddy state={state} size="mini" mode="video" />
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={hideOverlay}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center text-text-secondary hover:text-text transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Speech text */}
          {speechText && (
            <p className="text-sm text-text-secondary italic text-center mb-4 leading-relaxed">
              {speechText}
            </p>
          )}

          {/* Dynamic content */}
          {overlayContent && <div className="mt-2">{overlayContent}</div>}

          {/* Default content when no specific content */}
          {!overlayContent && !speechText && (
            <p className="text-sm text-text-secondary italic text-center leading-relaxed">
              Hey! I'm Buddy, your travel companion. How can I help you today?
            </p>
          )}
        </div>
      </div>
    </>
  );
}
