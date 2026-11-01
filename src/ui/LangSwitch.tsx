// The language switch: a small pill that flips the whole game between English and Spanish.
// It shows the language you'd switch TO, so a Spanish speaker on an English screen sees "ES".
import { useLang } from "../i18n/index.tsx";
import { play } from "../app/sound.ts";

export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <button
      type="button"
      onClick={() => {
        play("toggle");
        setLang(lang === "en" ? "es" : "en");
      }}
      aria-label={t.switchTo.label}
      title={t.switchTo.label}
      lang={lang === "en" ? "es" : "en"}
      className={`chip flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black transition hover:bg-brand-700 active:translate-y-px focus-visible:outline-3 focus-visible:outline-brand-500 ${className}`}
    >
      <span aria-hidden="true">🌐</span>
      {t.switchTo.short}
    </button>
  );
}
