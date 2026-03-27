import { useVoiceStore } from "../../stores/voiceStore";
import { Buddy } from "../Buddy";
import { startVoiceSession, stopVoiceSession } from "../../services/voicePipeline";

export function VoiceOverlay() {
  const { isOverlayOpen, state, transcript, buddyResponse, error } = useVoiceStore();

  if (!isOverlayOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={stopVoiceSession} />

      {/* Sheet */}
      <div className="relative bg-surface rounded-t-3xl w-full max-w-[430px] px-6 pt-6 pb-10 space-y-5 animate-slide-up">
        {/* Close */}
        <button
          type="button"
          onClick={stopVoiceSession}
          className="absolute top-4 right-4 text-text-muted hover:text-text"
          aria-label="Close voice mode"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Buddy Avatar */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full overflow-hidden">
            <Buddy
              state={state === "speaking" ? "happy" : state === "processing" ? "thinking" : "idle"}
              size="mini"
              mode="video"
            />
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          {state === "listening" && (
            <>
              <p className="text-sm font-medium text-primary">Listening...</p>
              <div className="flex justify-center gap-1 mt-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${12 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {state === "processing" && (
            <p className="text-sm font-medium text-text-secondary">Thinking...</p>
          )}
          {state === "speaking" && (
            <p className="text-sm font-medium text-primary">Speaking...</p>
          )}
          {state === "idle" && !error && !buddyResponse && (
            <p className="text-sm text-text-muted">Tap the mic to start talking</p>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-cream rounded-2xl px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">You said</p>
            <p className="text-sm text-text">{transcript}</p>
          </div>
        )}

        {/* Buddy Response */}
        {buddyResponse && (
          <div className="bg-primary/5 rounded-2xl px-4 py-3 border border-primary/10">
            <p className="text-[10px] uppercase tracking-wider text-primary font-medium mb-1">OmniBuddy</p>
            <p className="text-sm text-text-secondary italic leading-relaxed">{buddyResponse}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-conflict/10 rounded-2xl px-4 py-3">
            <p className="text-sm text-conflict">{error}</p>
          </div>
        )}

        {/* Mic Button */}
        <div className="flex justify-center">
          {state === "idle" || state === "speaking" ? (
            <button
              type="button"
              onClick={startVoiceSession}
              className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-light transition-colors"
              aria-label="Start listening"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopVoiceSession}
              className="w-16 h-16 rounded-full bg-conflict text-white flex items-center justify-center shadow-lg"
              aria-label="Stop"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
