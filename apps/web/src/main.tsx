import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initSupabase } from "@omnitrip/shared/services/supabase";
import { initOpenAI } from "@omnitrip/shared/services/chatgpt";
import { initPOI } from "@omnitrip/shared/services/poi";
import { hydrateSettings } from "@omnitrip/shared/stores/settingsStore";
import { setOpenUrlImpl } from "@omnitrip/shared/platform/openUrl";
import { setLocationImpl } from "@omnitrip/shared/platform/location";
import { setSpeechImpl } from "@omnitrip/shared/platform/speech";
import { setTtsImpl } from "@omnitrip/shared/platform/tts";
import "./index.css";

// ── Platform registrations ─────────────────────────────
// openUrl
setOpenUrlImpl((url) => window.open(url, "_blank"));

// Location
setLocationImpl(() =>
  new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 },
    );
  })
);

// Speech-to-text
setSpeechImpl({
  start(onResult, onEnd) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { onEnd(); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => onResult(e.results[0]?.[0]?.transcript ?? "");
    recognition.onend = onEnd;
    recognition.start();
  },
  stop() { /* Web Speech API stops itself */ },
  isAvailable() {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  },
});

// TTS
setTtsImpl({
  async speak(text) {
    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utter);
    }
  },
  stop() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  },
});

// ── Service initialisations ────────────────────────────
initSupabase(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

initOpenAI(
  import.meta.env.VITE_OPENAI_API_KEY as string,
  import.meta.env.VITE_OPENAI_MODEL as string | undefined,
);

initPOI(import.meta.env.VITE_FOURSQUARE_API_KEY as string ?? "");

void hydrateSettings();

// ── Render ─────────────────────────────────────────────
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
