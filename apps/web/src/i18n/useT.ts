import { useSettingsStore } from "../stores/settingsStore";
import { translations } from "./translations";
import type { Language } from "../stores/settingsStore";

export function useT() {
  const language = useSettingsStore((s) => s.language);
  return translations[language as Language] ?? translations.en;
}

export function getT(language: Language) {
  return translations[language] ?? translations.en;
}
