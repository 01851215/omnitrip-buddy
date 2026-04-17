// Text-to-Speech via ElevenLabs API (with browser fallback)

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — warm, friendly

let currentAudio: HTMLAudioElement | null = null;

export async function speak(text: string): Promise<void> {
  // Stop any currently playing audio
  stop();

  if (ELEVENLABS_API_KEY) {
    return speakElevenLabs(text);
  }
  return speakBrowser(text);
}

async function speakElevenLabs(text: string): Promise<void> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    console.warn("ElevenLabs TTS failed, falling back to browser TTS");
    return speakBrowser(text);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  currentAudio = new Audio(url);

  return new Promise((resolve) => {
    currentAudio!.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    };
    currentAudio!.onerror = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    };
    currentAudio!.play();
  });
}

function speakBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

export function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  speechSynthesis.cancel();
}
