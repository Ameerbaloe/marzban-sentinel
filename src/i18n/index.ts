import fa from "./locales/fa.json" with { type: "json" };
import en from "./locales/en.json" with { type: "json" };

export type Language = "fa" | "en";

const translations = {
  fa,
  en
} as const;

export type TranslationKey = keyof typeof fa;

export function translate(
  language: Language,
  key: TranslationKey
): string {
  return translations[language][key];
}

export function isLanguage(value: string): value is Language {
  return value === "fa" || value === "en";
}