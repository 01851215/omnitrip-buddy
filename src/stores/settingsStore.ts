import { create } from "zustand";

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

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: load<Theme>("settings:theme", "auto"),
  language: load<Language>("settings:language", "en"),
  voiceRecitation: load<boolean>("settings:voiceRecitation", true),

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
