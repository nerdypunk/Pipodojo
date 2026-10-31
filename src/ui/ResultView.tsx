import type { Mission, RunLog } from "../engine/types.ts";
import { plainAnswer, resultHeadline, resultNotes } from "../game/feedback.ts";
import { Button } from "./Button.tsx";
import { Pipo } from "./Pipo.tsx";

interface Props {
  mission: Mission;
  log: RunLog;
  onTryAgain: () => void;
}

export function ResultView({ mission, log, onTryAgain }: Props) {
  const { stars } = log.score;
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <Pipo mood={stars === 1 ? "oops" : "happy"} size={48} />
        <div className="flex-1 rounded-2xl border-2 border-gray-200 bg-white p-4">
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500">Pipo's answer</p>
          <p className="whitespace-pre-wrap">{plainAnswer(log.answer)}</p>
        </div>
      </div>

      <div className={`space-y-2 rounded-2xl p-4 ${stars === 1 ? "bg-amber-50" : "bg-green-50"}`}>
        <p className="text-3xl tracking-widest text-amber-400" aria-label={`${stars} out of 3 stars`}>
          {"★".repeat(stars)}
          <span className="text-gray-300">{"★".repeat(3 - stars)}</span>
        </p>
        <h2 className="text-xl font-bold">{resultHeadline(stars)}</h2>
        <ul className="list-disc space-y-1 pl-5">
          {resultNotes(mission, log.score).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="pt-1 text-sm text-gray-700">
          <span className="font-semibold">Remember: </span>
          {mission.lesson}
        </p>
      </div>

      <Button className="w-full" onClick={onTryAgain}>
        Try again
      </Button>
    </section>
  );
}
