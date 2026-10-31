import type { Mission } from "../engine/types.ts";
import { splitEmoji } from "../game/emoji.ts";
import type { AnswerLine } from "../game/feedback.ts";
import type { Mood } from "./Pipo.tsx";
import { PipoStage, type StageMode } from "./PipoStage.tsx";
import { ShaderBorder, type BorderMode } from "./ShaderBorder.tsx";

interface Props {
  mission: Mission;
  mood: Mood;
  stage: StageMode;
  /** Animated border around the card, following what Pipo is doing. */
  border: BorderMode;
  /** Stars once Pipo has answered, for the status island. */
  stars: number | null;
  /** Pipo's answer once it's in; until then Pipo shows the lesson's request. */
  answer: AnswerLine[] | null;
}

const LINE_DELAY_MS = 150;

/** Left card: Pipo on stage, what Pipo says, and what you know. */
export function PipoScene({ mission, mood, stage, border, stars, answer }: Props) {
  return (
    <section className="glass relative flex flex-1 flex-col gap-3 rounded-3xl p-3 md:p-4" aria-label="The situation">
      <ShaderBorder mode={border} roundness={0.1} />
      <PipoStage title={mission.title} mode={stage} mood={mood} stars={stars} />

      {answer ? <AnswerCard lines={answer} /> : <SpeechBubble>{mission.situation}</SpeechBubble>}

      {mission.facts.length > 0 && (
        <div className="px-1">
          <p className="mb-1.5 text-sm font-extrabold text-ink md:mb-2 md:text-base">What you know</p>
          <ul className="flex flex-wrap gap-1.5">
            {mission.facts.map((fact) => {
              const { emoji, text } = splitEmoji(fact);
              return (
                <li
                  key={fact}
                  className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-brand-900 md:px-3.5 md:py-1.5 md:text-base"
                >
                  {emoji && <span aria-hidden="true">{emoji}</span>}
                  {text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function SpeechBubble({ children }: { children: string }) {
  return (
    <div className="relative mt-1 rounded-2xl bg-white px-4 py-2.5 text-base leading-snug font-semibold shadow-sm md:py-3 md:text-xl">
      {/* Tail pointing up at Pipo */}
      <span className="absolute -top-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 bg-white" aria-hidden="true" />
      <span className="relative">{children}</span>
    </div>
  );
}

function AnswerCard({ lines }: { lines: AnswerLine[] }) {
  return (
    <ul className="space-y-1.5" aria-label="Pipo's answer">
      {lines.map((line, i) => (
        <li
          key={i}
          className={`pop-in flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[15px] leading-snug font-bold shadow-sm md:py-2 md:text-base ${
            line.flagged ? "bg-red-50 text-red-900 ring-2 ring-red-300" : "bg-white"
          }`}
          style={{ animationDelay: `${i * LINE_DELAY_MS}ms` }}
        >
          <span className="text-xl" aria-hidden="true">
            {line.emoji || "•"}
          </span>
          {line.text}
        </li>
      ))}
    </ul>
  );
}
