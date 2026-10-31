// The game's two languages. The player's choice is remembered on this device; on a first visit
// the browser's language decides (Spanish if it's any kind of Spanish, otherwise English).
import { createContext, useContext } from "react";
import type { Lang } from "../engine/types.ts";
import { en, type Strings } from "./en.ts";
import { es } from "./es.ts";

export type { Lang, Strings };

export const STRINGS: Record<Lang, Strings> = { en, es };

const KEY = "pipodojo.lang";

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    // No storage: fall back to the browser's language.
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith("es")) ? "es" : "en";
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
