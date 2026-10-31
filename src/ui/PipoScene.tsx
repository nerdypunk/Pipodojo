import type { Mission, PipoAction } from "../engine/types.ts";
import { splitEmoji } from "../game/emoji.ts";
import type { AnswerLine } from "../game/feedback.ts";
import type { Mood } from "./Pipo.tsx";
import { PipoStage, type StageMode } from "./PipoStage.tsx";
import { isLaptopApp } from "./LaptopApps.tsx";
import { useLang } from "../i18n/index.tsx";

interface Props {
  mission: Mission;
  mood: Mood;
  stage: StageMode;
  /** Stars once Pipo has answered, for the status island. */
  stars: number | null;
  /** Pipo's answer once it's in; until then the mission panel shows Pipo's request. */
  answer: AnswerLine[] | null;
  /** Set when Pipo acted in an app (a tool call); the phone itself floats over the page. */
  action?: PipoAction | undefined;
  /** Shown while the floating phone is put away. */
  onOpenPhone?: (() => void) | undefined;
}

const LINE_DELAY_MS = 150;

/** Left card, split in half: Pipo on stage on top, the mission you're on below. */
export function PipoScene({ mission, mood, stage, stars, answer, action, onOpenPhone }: Props) {
  const { t } = useLang();
  return (
    <section className="glass flex flex-1 flex-col gap-3 rounded-3xl p-3 md:p-4" aria-label={t.lesson.mission}>
      <PipoStage mode={stage} mood={mood} stars={stars} />
      <MissionPanel mission={mission} answer={answer} action={action} onOpenPhone={onOpenPhone} />
    </section>
  );
}

function MissionPanel({
  mission,
  answer,
  action,
  onOpenPhone,
}: {
  mission: Mission;
  answer: AnswerLine[] | null;
  action?: PipoAction | undefined;
  onOpenPhone?: (() => void) | undefined;
}) {
  const { t } = useLang();
  return (
    <div className="relative flex flex-1 basis-0 flex-col gap-3 rounded-2xl bg-white/90 p-4 shadow-sm">
      {/* Tail pointing up at Pipo: this is Pipo talking to you */}
      <span className="absolute -top-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 bg-white/90" aria-hidden="true" />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-white">
          <span aria-hidden="true">🎯</span> {t.lesson.mission}
        </span>
        <h1 className="mt-1 text-2xl leading-tight font-black text-ink md:text-[28px]">{mission.title}</h1>
      </div>

      {answer ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-gray-600">{action ? (isLaptopApp(action.app) ? t.lesson.codeBuilt : t.lesson.phoneDid) : t.lesson.pipoAnswer}</p>
            {onOpenPhone && (
              <button
                type="button"
                onClick={onOpenPhone}
                className="rounded-full bg-ink px-3 py-1 text-xs font-extrabold text-white hover:bg-brand-800"
              >
                <span aria-hidden="true">{action && isLaptopApp(action.app) ? "💻 " : "📱 "}</span>
                {action && isLaptopApp(action.app) ? t.lesson.openLaptop : t.lesson.openPhone}
              </button>
            )}
          </div>
          <AnswerCard lines={answer} short={!!action} />
        </div>
      ) : (
        <p className="text-lg leading-snug font-semibold text-ink md:text-xl">{mission.situation}</p>
      )}

      {mission.facts.length > 0 && (
        <div className="mt-auto border-t border-brand-100 pt-3">
          <p className="mb-1.5 text-sm font-extrabold text-gray-600">{t.lesson.whatYouKnow}</p>
          <ul className="flex flex-wrap gap-2">
            {mission.facts.map((fact) => {
              const { emoji, text } = splitEmoji(fact);
              return (
                <li
                  key={fact}
                  className={`flex items-center gap-2 rounded-xl bg-brand-50 font-bold text-brand-900 ring-1 ring-brand-200 ${
                    // Compact once Pipo's answer takes the space
                    answer ? "px-2.5 py-1 text-sm" : "px-3 py-1.5 text-[15px] md:px-3.5 md:py-2 md:text-base"
                  }`}
                >
                  {emoji && (
                    <span className={answer ? "text-base" : "text-lg"} aria-hidden="true">
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
    </div>
  );
}

/** `short`: one line each, for when the phone already shows the full details. */
function AnswerCard({ lines, short = false }: { lines: AnswerLine[]; short?: boolean }) {
  const { t } = useLang();
  return (
    <ul className="space-y-1.5" aria-label={t.lesson.pipoAnswer}>
      {lines.map((line, i) => (
        <li
          key={i}
          className={`pop-in flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[15px] leading-snug font-bold md:py-2 md:text-base ${
            line.flagged ? "bg-red-50 text-red-900 ring-2 ring-red-300" : "bg-brand-50"
          }`}
          style={{ animationDelay: `${i * LINE_DELAY_MS}ms` }}
        >
          <span className="text-xl" aria-hidden="true">
            {line.emoji || "•"}
          </span>
          <span className={short ? "min-w-0 truncate" : ""}>{line.text}</span>
        </li>
      ))}
    </ul>
  );
}
