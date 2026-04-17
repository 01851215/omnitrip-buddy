/**
 * Platform-agnostic text-to-speech adapter.
 *
 * Web:    register via setTtsImpl() in apps/web/src/platform/tts.web.ts
 * Mobile: register via setTtsImpl() in apps/mobile/src/setup.ts using expo-speech
 */

export interface TtsAdapter {
  speak(text: string): Promise<void>;
  stop(): void;
}

// Default: no-op until a platform registers its implementation
const noopTts: TtsAdapter = {
  async speak(_text) { /* no-op — call setTtsImpl() with a platform adapter */ },
  stop() { /* no-op */ },
};

let _impl: TtsAdapter = noopTts;

export function setTtsImpl(adapter: TtsAdapter): void {
  _impl = adapter;
}

export function getTtsAdapter(): TtsAdapter {
  return _impl;
}
