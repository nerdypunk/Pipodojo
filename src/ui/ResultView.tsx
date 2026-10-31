import type { Mission, RunLog } from "../engine/types.ts";
import { answerLines, resultHeadline, resultNotes } from "../game/feedback.ts";
import { Button } from "./Button.tsx";
import { Pipo } from "./Pipo.tsx";

interface Props {
  mission: Mission;
  log: RunLog;
  onTryAgain: () => void;
}

const LINE_DELAY_MS = 150;

export function ResultView({ mission, log, onTryAgain }: Props) {
  const { stars } = log.score;
  const lines = answerLines(mission, log.score, log.answer);
  const scoreDelay = `${lines.length * LINE_DELAY_MS + 150}ms`;
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <Pipo mood={stars === 1 ? "oops" : "happy"} size={48} />
        <ul className="flex-1 space-y-2" aria-label="Pipo's answer">
          {lines.map((line, i) => (
            <li
              key={i}
              className={`pop-in flex items-center gap-3 rounded-2xl border-2 border-b-4 px-3 py-2 ${
                line.flagged ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
              }`}
              style={{ animationDelay: `${i * LINE_DELAY_MS}ms` }}
            >
              <span className="text-2xl" aria-hidden="true">
                {line.emoji || "•"}
              </span>
              <span className="font-medium">{line.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`pop-in space-y-2 rounded-2xl p-4 text-center ${stars === 1 ? "bg-amber-50" : "bg-green-50"}`}
        style={{ animationDelay: scoreDelay }}
      >
        <p className="text-4xl tracking-widest text-amber-400" aria-label={`${stars} out of 3 stars`}>
          {"★".repeat(stars)}
          <span className="text-gray-300">{"★".repeat(3 - stars)}</span>
        </p>
        <h2 className="text-xl font-bold">{resultHeadline(stars)}</h2>
        {resultNotes(mission, log.score).map((note) => (
          <p key={note}>{note}</p>
        ))}
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
