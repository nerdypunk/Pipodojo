// The game's languages. The player's choice is remembered on this device; on a first visit the
// browser's main language decides (Spanish or Japanese if it's any kind of those, otherwise English).
import { createContext, useContext } from "react";
import type { Lang } from "../engine/types.ts";
import { en, type Strings } from "./en.ts";
import { es } from "./es.ts";
import { ja } from "./ja.ts";

export type { Lang, Strings };

export const STRINGS: Record<Lang, Strings> = { en, es, ja };

/** Every language, named in its own words for the language menu. */
export const LANGS: readonly { id: Lang; short: string; name: string }[] = [
  { id: "en", short: "EN", name: "English" },
  { id: "es", short: "ES", name: "Español" },
  { id: "ja", short: "JA", name: "日本語" },
];

const isLang = (value: unknown): value is Lang => LANGS.some((l) => l.id === value);

const KEY = "pipodojo.lang";

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    // No storage: fall back to the browser's language.
  }
  // Only the browser's main language counts: Spanish gets Spanish, Japanese gets Japanese;
  // English, or anything else, gets English.
  const main = (navigator.languages?.[0] ?? navigator.language)?.toLowerCase().split("-")[0];
  return main === "es" || main === "ja" ? main : "en";
}

export function saveLang(lang: Lang) {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Not remembered this time.
  }
}

export const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: "en", setLang: () => {} });

/** The current language, a way to change it, and the words for it. */
export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  return { lang, setLang, t: STRINGS[lang] };
}
