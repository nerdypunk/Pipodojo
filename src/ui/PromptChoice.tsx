// "Pick a prompt": instead of building the message from pieces, the player chooses between two
// finished messages for the same task. One has everything Pipo needs; the other has two flaws
// (facts left out, or weak bits swapped in), so the difference is easy to spot without being
// silly. Only the chosen one goes to Pipo, scored by the same rules as every lesson. The pair is
// fixed for the visit, so Try again can test the other.
import { useState } from "react";
import { play } from "../app/sound.ts";
import { buildPrompt } from "../engine/brief.ts";
import { promptPair } from "../engine/setups.ts";
import type { Mission } from "../engine/types.ts";
import { useLang } from "../i18n/index.tsx";
import type { PickerProps } from "./MissionPlayer.tsx";

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id) => b.includes(id));

export function PromptChoice({ mission, picks, choose, done }: PickerProps & { mission: Mission }) {
  const { t } = useLang();
  const [pair] = useState(() => promptPair(mission));

  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-base font-black text-ink md:text-lg">{t.lesson.choose}</p>
        <p className="text-sm font-semibold text-gray-600">{t.lesson.chooseSub}</p>
      </div>
      <div className="space-y-2.5" role="radiogroup" aria-label={t.lesson.choose}>
        {pair.map((option, i) => {
          const side = i === 0 ? "A" : "B";
          const on = same(option, picks);
          return (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={done}
              onClick={() => {
                play("pick");
                choose(option);
              }}
              className={`flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition motion-reduce:transition-none ${
                on ? "bg-brand-50 ring-3 ring-brand-500" : done ? "opacity-45" : "bg-white/70 ring-1 ring-white hover:bg-white hover:ring-brand-200"
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  on ? "bg-brand-600 text-white" : "bg-white text-brand-700 ring-2 ring-brand-200"
                }`}
                aria-hidden="true"
              >
                {on ? "✓" : side}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex items-center gap-2 text-xs font-black tracking-wide text-brand-700 uppercase">
                  {t.lesson.option(side)}
                  {on && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] text-white normal-case">{t.lesson.yourPick}</span>}
                </span>
                <span
                  className={`block rounded-2xl rounded-br-md px-3.5 py-2.5 text-[15px] leading-snug font-semibold md:text-base ${
                    on ? "bg-brand-600 text-white" : "bg-white text-ink ring-1 ring-brand-100"
                  }`}
                >
                  {buildPrompt(mission, option)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
