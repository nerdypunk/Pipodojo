import type { Mission, Score } from "../engine/types.ts";
import { resultHeadline, resultNotes } from "../game/feedback.ts";
import { Button } from "./Button.tsx";

type Props =
  | { state: "build"; nudge: string | null; onCheck: () => void }
  | { state: "thinking" }
  | { state: "result"; mission: Mission; score: Score; onTryAgain: () => void }
  | { state: "failed"; onTryAgain: () => void };

/** Bottom bar: the Check button while building, the result banner after. */
export function ActionBar(props: Props) {
  if (props.state === "result") return <ResultBanner {...props} />;

  if (props.state === "failed") {
    return (
      <Bar className="slide-up border-amber-200 bg-amber-50">
        <div className="flex-1">
          <p className="text-xl font-black text-amber-800">Pipo got a little tangled up</p>
          <p className="font-semibold text-amber-700">That happens sometimes. Let's give it another go.</p>
        </div>
        <Button tone="amber" className="w-full md:w-48" onClick={props.onTryAgain}>
          Try again
        </Button>
      </Bar>
    );
  }

  const thinking = props.state === "thinking";
  return (
    <Bar className="border-gray-200 bg-white">
      <p className={`flex-1 font-bold ${!thinking && props.nudge ? "text-red-600" : "text-gray-400"}`} aria-live="polite">
        {thinking ? "Pipo is reading your message…" : (props.nudge ?? "Build your message, then check it.")}
      </p>
      <Button className="w-full md:w-48" disabled={thinking} onClick={thinking ? undefined : props.onCheck}>
        {thinking ? "Thinking…" : "Check"}
      </Button>
    </Bar>
  );
}

function ResultBanner({ mission, score, onTryAgain }: { mission: Mission; score: Score; onTryAgain: () => void }) {
  const missed = score.stars === 1;
  const notes = resultNotes(mission, score);
  return (
    <Bar
      className={`slide-up ${missed ? "border-amber-200 bg-amber-50" : "border-brand-200 bg-brand-50"}`}
      label="Your result"
    >
      <div className="flex-1 space-y-1">
        <p className={`flex flex-wrap items-center gap-x-3 text-2xl font-black ${missed ? "text-amber-800" : "text-brand-700"}`}>
          <span className="tracking-widest" aria-label={`${score.stars} out of 3 stars`}>
            <span className="text-amber-400">{"★".repeat(score.stars)}</span>
            <span className="text-gray-300">{"★".repeat(3 - score.stars)}</span>
          </span>
          {resultHeadline(score.stars)}
        </p>
        {notes.map((note) => (
          <p key={note} className={`font-bold ${missed ? "text-amber-800" : "text-brand-800"}`}>
            {note}
          </p>
        ))}
        <p className={`text-sm font-semibold ${missed ? "text-amber-700" : "text-brand-700"}`}>
          Remember: {mission.lesson}
        </p>
      </div>
      <Button tone={missed ? "amber" : "primary"} className="w-full md:w-48" onClick={onTryAgain}>
        Try again
      </Button>
    </Bar>
  );
}

function Bar({ className, label, children }: { className: string; label?: string; children: React.ReactNode }) {
  return (
    <footer className={`sticky bottom-0 border-t-2 ${className}`} aria-label={label}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-8 md:px-8 md:py-6">
        {children}
      </div>
    </footer>
  );
}
