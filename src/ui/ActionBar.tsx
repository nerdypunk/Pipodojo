import type { Mission, Score } from "../engine/types.ts";
import { resultHeadline, resultNotes } from "../game/feedback.ts";
import { Button } from "./Button.tsx";

type Props =
  | { state: "build"; nudge: string | null; onCheck: () => void }
  | { state: "thinking" }
  | { state: "result"; mission: Mission; score: Score; onTryAgain: () => void }
  | { state: "failed"; onTryAgain: () => void };

/** Foot of the playground card: Check while building, the result after. */
export function ActionBar(props: Props) {
  if (props.state === "result") return <Result {...props} />;

  if (props.state === "failed") {
    return (
      <Panel className="bg-amber-50/90">
        <div className="flex-1">
          <p className="text-lg font-black text-amber-800">Pipo got a little tangled up</p>
          <p className="font-semibold text-amber-700">That happens sometimes. Let's give it another go.</p>
        </div>
        <Button tone="amber" className="w-full sm:w-40" onClick={props.onTryAgain}>
          Try again
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
        {thinking ? "Pipo is reading your message…" : (props.nudge ?? "Build your message, then check it.")}
      </p>
      <Button className="w-full sm:w-40" disabled={thinking} onClick={thinking ? undefined : props.onCheck}>
        {thinking ? "Thinking…" : "Check"}
      </Button>
    </div>
  );
}

function Result({ mission, score, onTryAgain }: { mission: Mission; score: Score; onTryAgain: () => void }) {
  const missed = score.stars === 1;
  const notes = resultNotes(mission, score);
  const text = missed ? "text-amber-800" : "text-brand-800";
  return (
    <Panel className={missed ? "bg-amber-50/90" : "bg-white/80"} label="Your result">
      <div className="flex-1 space-y-0.5">
        <p className={`flex flex-wrap items-center gap-x-2.5 text-xl font-black ${text}`}>
          <span className="tracking-widest" aria-label={`${score.stars} out of 3 stars`}>
            <span className="text-amber-400">{"★".repeat(score.stars)}</span>
            <span className="text-gray-300">{"★".repeat(3 - score.stars)}</span>
          </span>
          {resultHeadline(score.stars)}
        </p>
        {notes.map((note) => (
          <p key={note} className={`font-bold ${text}`}>
            {note}
          </p>
        ))}
        <p className="text-sm font-semibold text-gray-600">Remember: {mission.lesson}</p>
      </div>
      <Button tone={missed ? "amber" : "primary"} className="w-full sm:w-40" onClick={onTryAgain}>
        Try again
      </Button>
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
