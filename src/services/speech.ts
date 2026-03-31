// Web Speech API wrapper for speech-to-text

type SpeechCallback = (transcript: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;

export function isSupported(): boolean {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

/**
 * Explicitly request microphone permission from the browser.
 * Returns "granted" | "denied" | "prompt".
 */
export async function requestMicPermission(): Promise<"granted" | "denied" | "prompt"> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Got permission — stop the stream immediately (we just needed the prompt)
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

export function startListening(
  onResult: SpeechCallback,
  onError: ErrorCallback,
  options?: { continuous?: boolean },
): void {
  if (!isSupported()) {
    onError("Speech recognition not supported in this browser");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = options?.continuous ?? false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    onResult(transcript, isFinal);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    if (event.error === "no-speech") {
      // In continuous mode, restart instead of erroring
      if (options?.continuous && recognition) {
        try { recognition.start(); } catch { /* already running */ }
        return;
      }
      onError("No speech detected. Try again.");
    } else if (event.error === "not-allowed") {
      onError("Microphone access denied. Please allow microphone in browser settings.");
    } else {
      onError(`Speech error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    // In continuous mode, auto-restart when recognition ends naturally
    if (options?.continuous && recognition) {
      try { recognition.start(); } catch { /* already running or stopped */ }
    }
  };

  recognition.start();
}

export function stopListening(): void {
  const ref = recognition;
  recognition = null;
  if (ref) {
    ref.onend = null; // Prevent auto-restart in continuous mode
    ref.stop();
  }
}
