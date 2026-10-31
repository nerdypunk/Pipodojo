import type { Mission } from "../engine/types.ts";
import { splitEmoji } from "../game/emoji.ts";
import type { AnswerLine } from "../game/feedback.ts";
import { Pipo, type Mood } from "./Pipo.tsx";

interface Props {
  mission: Mission;
  mood: Mood;
  thinking: boolean;
  /** Pipo's answer once it's in; until then Pipo shows the lesson's request. */
  answer: AnswerLine[] | null;
}

const LINE_DELAY_MS = 150;

/** Left card: Pipo, what Pipo says, and what you know. */
export function PipoScene({ mission, mood, thinking, answer }: Props) {
  return (
    <section className="glass flex flex-col gap-4 rounded-3xl p-4 md:p-5" aria-label="The situation">
      <h1 className="text-xl font-black md:text-2xl">{mission.title}</h1>

      <div className="flex items-start gap-3">
        <Pipo mood={mood} className="h-auto w-16 shrink-0 md:w-20" />
        {answer ? <AnswerCard lines={answer} /> : <SpeechBubble thinking={thinking}>{mission.situation}</SpeechBubble>}
      </div>

      {mission.facts.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-extrabold text-gray-500">What you know</p>
          <ul className="flex flex-wrap gap-1.5">
            {mission.facts.map((fact) => {
              const { emoji, text } = splitEmoji(fact);
              return (
                <li
                  key={fact}
                  className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-[15px] font-bold text-brand-900"
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

function SpeechBubble({ thinking, children }: { thinking: boolean; children: string }) {
  return (
    <div className="relative mt-1 flex-1 rounded-2xl bg-white px-4 py-2.5 leading-snug font-semibold shadow-sm">
      {/* Tail pointing at Pipo */}
      <span className="absolute top-5 -left-1.5 h-3.5 w-3.5 rotate-45 bg-white" aria-hidden="true" />
      <span className="relative">{children}</span>
      {thinking && (
        <span className="relative mt-2 flex gap-1.5" aria-label="Pipo is thinking">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 animate-bounce rounded-full bg-brand-300 motion-reduce:animate-none"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

function AnswerCard({ lines }: { lines: AnswerLine[] }) {
  return (
    <ul className="flex-1 space-y-1.5" aria-label="Pipo's answer">
      {lines.map((line, i) => (
        <li
          key={i}
          className={`pop-in flex items-center gap-2.5 rounded-xl px-3 py-2 text-[15px] leading-snug font-bold shadow-sm ${
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
