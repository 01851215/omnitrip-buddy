import { create } from "zustand";
import { getStorageAdapter } from "../platform/storage";

export type Theme = "light" | "dark" | "auto";
export type Language = "en" | "zh" | "ja" | "fr" | "es" | "ar";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  fr: "Français",
  es: "Español",
  ar: "العربية",
};

interface SettingsStore {
  theme: Theme;
  language: Language;
  voiceRecitation: boolean;

  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setVoiceRecitation: (v: boolean) => void;
}

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getStorageAdapter().getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    void getStorageAdapter().setItem(key, JSON.stringify(value));
  } catch {}
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  // Start with defaults; hydrated asynchronously via hydrateSettings()
  theme: "auto",
  language: "en",
  voiceRecitation: true,

  setTheme: (t) => {
    save("settings:theme", t);
    set({ theme: t });
  },
  setLanguage: (l) => {
    save("settings:language", l);
    set({ language: l });
  },
  setVoiceRecitation: (v) => {
    save("settings:voiceRecitation", v);
    set({ voiceRecitation: v });
  },
}));

/**
 * Call once at app startup (after storage adapter is registered) to load persisted settings.
 * Web: call in main.tsx after ReactDOM.createRoot()
 * Mobile: call in App.tsx useEffect or setup.ts
 */
export async function hydrateSettings(): Promise<void> {
  const [theme, language, voiceRecitation] = await Promise.all([
    load<Theme>("settings:theme", "auto"),
    load<Language>("settings:language", "en"),
    load<boolean>("settings:voiceRecitation", true),
  ]);
  useSettingsStore.setState({ theme, language, voiceRecitation });
}
