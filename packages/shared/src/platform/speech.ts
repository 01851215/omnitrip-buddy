/**
 * Platform-agnostic speech-to-text adapter.
 *
 * Web:    register via setSpeechImpl() in apps/web/src/platform/speech.web.ts
 * Mobile: register via setSpeechImpl() in apps/mobile/src/setup.ts using @react-native-voice/voice
 */

export interface SpeechAdapter {
  start(onResult: (transcript: string) => void, onEnd: () => void): void;
  stop(): void;
  isAvailable(): boolean;
}

// Default: no-op until a platform registers its implementation
const noopSpeech: SpeechAdapter = {
  start(_onResult, onEnd) { onEnd(); },
  stop() { /* no-op */ },
  isAvailable() { return false; },
};

let _impl: SpeechAdapter = noopSpeech;

export function setSpeechImpl(adapter: SpeechAdapter): void {
  _impl = adapter;
}

export function getSpeechAdapter(): SpeechAdapter {
  return _impl;
}
