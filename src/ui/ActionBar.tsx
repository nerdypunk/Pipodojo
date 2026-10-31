import type { Mission, Score } from "../engine/types.ts";
import { resultNotes } from "../game/feedback.ts";
import { useLang } from "../i18n/index.tsx";
import { Button } from "./Button.tsx";

type Props =
  | { state: "build"; nudge: string | null; onCheck: () => void }
  | { state: "thinking" }
  | { state: "result"; mission: Mission; score: Score; onTryAgain: () => void; next: NextStep }
  | { state: "failed"; onTryAgain: () => void };

/** Where the player goes after a result (the lesson complete screen). */
export interface NextStep {
  label: string;
  onGo: () => void;
}

/** Foot of the playground card: Check while building, the result after. */
export function ActionBar(props: Props) {
  const { t } = useLang();
  if (props.state === "result") return <Result {...props} />;

  if (props.state === "failed") {
    return (
      <Panel className="bg-amber-50/90">
        <div className="flex-1">
          <p className="text-lg font-black text-amber-800">{t.lesson.tangled}</p>
          <p className="font-semibold text-amber-700">{t.lesson.tangledSub}</p>
        </div>
        <Button tone="amber" className="w-full sm:w-40" onClick={props.onTryAgain}>
          {t.common.tryAgain}
        </Button>
      </Panel>
    );
  }

  const thinking = props.state === "thinking";
  return (
    <div className="flex flex-col gap-2 border-t border-white/70 pt-4 sm:flex-row sm:items-center sm:gap-4">
      <p
        className={`flex-1 text-sm font-bold ${!thinking && props.nudge ? "text-red-600" : "text-gray-500"}`}
        aria-live="polite"
      >
        {thinking ? t.lesson.reading : (props.nudge ?? t.lesson.idle)}
      </p>
      <Button className="w-full sm:w-40" disabled={thinking} onClick={thinking ? undefined : props.onCheck}>
        {thinking ? t.lesson.thinkingButton : t.lesson.check}
      </Button>
    </div>
  );
}

function Result({
  mission,
  score,
  onTryAgain,
  next,
}: {
  mission: Mission;
  score: Score;
  onTryAgain: () => void;
  next: NextStep;
}) {
  const { t } = useLang();
  const missed = score.stars === 1;
  const notes = resultNotes(mission, score, t.lesson.allGood);
  const text = missed ? "text-amber-800" : "text-brand-800";
  return (
    <Panel className={missed ? "bg-amber-50/90" : "bg-white/80"} label={t.lesson.result}>
      <div className="flex-1 space-y-0.5">
        <p className={`flex flex-wrap items-center gap-x-2.5 text-xl font-black ${text}`}>
          <span className="tracking-widest" aria-label={t.common.starsOf(score.stars)}>
            <span className="text-amber-400">{"★".repeat(score.stars)}</span>
            <span className="text-gray-300">{"★".repeat(3 - score.stars)}</span>
          </span>
          {t.lesson.headline[score.stars]}
        </p>
        {notes.map((note) => (
          <p key={note} className={`font-bold ${text}`}>
            {note}
          </p>
        ))}
        <p className="text-sm font-semibold text-gray-600">{t.lesson.remember} {mission.lesson}</p>
      </div>
      {/* A good result leads on; a miss leads with another try (moving on is still allowed). */}
      <div className="flex flex-col gap-2 sm:w-40">
        {missed ? (
          <>
            <Button tone="amber" className="w-full" onClick={onTryAgain}>
              {t.common.tryAgain}
            </Button>
            <Button tone="plain" className="w-full" onClick={next.onGo}>
              {next.label}
            </Button>
          </>
        ) : (
          <>
            <Button className="w-full" onClick={next.onGo}>
              {next.label}
            </Button>
            <Button tone="plain" className="w-full" onClick={onTryAgain}>
              {t.common.tryAgain}
            </Button>
          </>
        )}
      </div>
    </Panel>
  );
}

function Panel({ className, label, children }: { className: string; label?: string; children: React.ReactNode }) {
  return (
    <section
      className={`pop-in flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${className}`}
      aria-label={label}
    >
      {children}
    </section>
  );
}
