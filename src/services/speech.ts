// Web Speech API wrapper for speech-to-text

type SpeechCallback = (transcript: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;

export function isSupported(): boolean {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

export function startListening(onResult: SpeechCallback, onError: ErrorCallback): void {
  if (!isSupported()) {
    onError("Speech recognition not supported in this browser");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false;
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
      onError("No speech detected. Try again.");
    } else if (event.error === "not-allowed") {
      onError("Microphone access denied. Please allow microphone in browser settings.");
    } else {
      onError(`Speech error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    // Natural end of recognition
  };

  recognition.start();
}

export function stopListening(): void {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}
