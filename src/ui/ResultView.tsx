import type { Mission, RunLog } from "../engine/types.ts";
import { resultHeadline, resultNotes } from "../game/feedback.ts";
import { Button } from "./Button.tsx";

interface Props {
  mission: Mission;
  log: RunLog;
  onTryAgain: () => void;
}

export function ResultView({ mission, log, onTryAgain }: Props) {
  const { stars } = log.score;
  return (
    <section className="space-y-4">
      <p className="text-4xl tracking-widest text-orange-500" aria-label={`${stars} out of 3 stars`}>
        {"★".repeat(stars)}
        <span className="text-gray-300">{"★".repeat(3 - stars)}</span>
      </p>
      <h2 className="text-xl font-semibold">{resultHeadline(stars)}</h2>

      <div className="space-y-2 rounded-lg bg-gray-100 p-3">
        <p className="font-semibold">What just happened</p>
        <ul className="list-disc space-y-1 pl-5">
          {resultNotes(mission, log).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <p className="rounded-lg border p-3">
        <span className="font-semibold">Lesson: </span>
        {mission.lesson}
      </p>

      <Button className="w-full" onClick={onTryAgain}>
        Try again
      </Button>
    </section>
  );
}
