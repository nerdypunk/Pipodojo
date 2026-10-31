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

/** Left side: Pipo, what Pipo says, and what you know. */
export function PipoScene({ mission, mood, thinking, answer }: Props) {
  return (
    <section className="space-y-5" aria-label="The situation">
      <h1 className="text-2xl font-black md:text-3xl">{mission.title}</h1>

      <div className="flex items-start gap-3 md:gap-4">
        <Pipo mood={mood} className="h-auto w-20 shrink-0 md:w-28" />
        {answer ? <AnswerCard lines={answer} /> : <SpeechBubble thinking={thinking}>{mission.situation}</SpeechBubble>}
      </div>

      {!answer && mission.facts.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-extrabold text-gray-400">What you know</p>
          <ul className="grid gap-2">
            {mission.facts.map((fact) => {
              const { emoji, text } = splitEmoji(fact);
              return (
                <li
                  key={fact}
                  className="flex items-center gap-3 rounded-2xl border-2 border-brand-100 bg-brand-50 px-4 py-2.5 font-bold text-brand-900"
                >
                  {emoji && (
                    <span className="text-xl" aria-hidden="true">
                      {emoji}
                    </span>
                  )}
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
    <div className="relative mt-2 flex-1 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-lg leading-snug font-semibold">
      {/* Tail pointing at Pipo */}
      <span
        className="absolute top-6 -left-[9px] h-4 w-4 rotate-45 border-b-2 border-l-2 border-gray-200 bg-white"
        aria-hidden="true"
      />
      {children}
      {thinking && (
        <span className="mt-2 flex gap-1.5" aria-label="Pipo is thinking">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-gray-300 motion-reduce:animate-none"
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
    <ul className="flex-1 space-y-2" aria-label="Pipo's answer">
      {lines.map((line, i) => (
        <li
          key={i}
          className={`pop-in flex items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-2.5 font-bold ${
            line.flagged ? "border-red-300 bg-red-50 text-red-900" : "border-gray-200 bg-white"
          }`}
          style={{ animationDelay: `${i * LINE_DELAY_MS}ms` }}
        >
          <span className="text-2xl" aria-hidden="true">
            {line.emoji || "•"}
          </span>
          {line.text}
        </li>
      ))}
    </ul>
  );
}
