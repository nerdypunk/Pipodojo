// Pipo's Lab: a testing area, opened with #lab in the address, for new ways to play before they
// join the main game. For now: "Which prompt wins?".
import { useState } from "react";
import { useLang } from "../../i18n/index.tsx";
import { Button } from "../Button.tsx";
import { LangSwitch } from "../LangSwitch.tsx";
import { Pipo } from "../Pipo.tsx";
import { SoundButton } from "../SoundButton.tsx";
import { Versus } from "./Versus.tsx";

type View = { name: "menu" } | { name: "versus" };

export function Lab({ onExit }: { onExit: () => void }) {
  const { t } = useLang();
  const [view, setView] = useState<View>({ name: "menu" });

  if (view.name === "versus") return <Versus onBack={() => setView({ name: "menu" })} />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 p-3 md:p-6">
      <header className="relative flex flex-col items-center gap-1.5 text-center">
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2 rounded-2xl border-b-4 border-brand-800 bg-brand-600 py-2 pr-4 pl-3 text-sm font-black text-white transition hover:bg-brand-700 active:translate-y-0.5 active:border-b-2"
          >
            <span aria-hidden="true">‹ 🏘️</span> {t.lab.back}
          </button>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <SoundButton />
          </div>
        </div>
        <Pipo mood="happy" className="h-16 w-16 drop-shadow-[0_6px_16px_rgba(45,36,112,0.35)]" />
        <p className="text-sm font-black tracking-wide text-brand-700 uppercase">{t.lab.kicker}</p>
        <h1 className="text-3xl font-black text-ink md:text-4xl">{t.lab.title}</h1>
        <p className="font-semibold text-gray-600">{t.lab.intro}</p>
      </header>

      <section className="glass mx-auto flex w-full max-w-sm flex-col gap-3 rounded-3xl p-3">
        <div className="flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-200 to-brand-300">
          <span className="text-5xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.2)]" aria-hidden="true">
            ⚖️
          </span>
        </div>
        <div className="px-1">
          <h2 className="text-xl font-black text-ink">{t.lab.versusTitle}</h2>
          <p className="text-[15px] leading-snug font-semibold text-gray-600">{t.lab.versusBlurb}</p>
        </div>
        <Button className="w-full" onClick={() => setView({ name: "versus" })}>
          {t.lab.play}
        </Button>
      </section>
    </div>
  );
}
