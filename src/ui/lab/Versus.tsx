// "Which prompt wins?": two messages for the same task, side by side. The player guesses which
// one gets Pipo's better answer, then both go to Muse Spark live and our rules score them.
import { useEffect, useRef, useState } from "react";
import { liveClient, takeLiveRun } from "../../app/liveClient.ts";
import { missionsIn } from "../../app/missions.ts";
import { play } from "../../app/sound.ts";
import { askPipo } from "../../engine/agentRunner.ts";
import { buildPrompt } from "../../engine/brief.ts";
import { evaluate } from "../../engine/evaluator.ts";
import { bestPicks, keySetups } from "../../engine/setups.ts";
import type { Mission, Score } from "../../engine/types.ts";
import { answerLines, resultNotes } from "../../game/feedback.ts";
import { VERSUS_ROUNDS } from "../../game/versus.ts";
import { useLang } from "../../i18n/index.tsx";
import { Button } from "../Button.tsx";
import { Pipo } from "../Pipo.tsx";
import { SoundButton } from "../SoundButton.tsx";

type Side = "A" | "B";
type Run = { answer: string; score: Score } | null;
type Phase = { name: "choose" } | { name: "running"; guess: Side } | { name: "reveal"; guess: Side; runs: Record<Side, Run> };

export function Versus({ onBack }: { onBack: () => void }) {
  const { lang, t } = useLang();
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>({ name: "choose" });
  // On phones the status and the verdict sit below both cards: bring them into view.
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase.name === "choose") return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    status.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  }, [phase.name]);

  const spec = VERSUS_ROUNDS[round]!;
  const mission = missionsIn(lang).find((m) => m.id === spec.missionId)!;
  const best = bestPicks(mission);
  const weak = keySetups(mission)[spec.flaw] ?? best;
  const picks: Record<Side, string[]> = spec.bestSide === "A" ? { A: best, B: weak } : { A: weak, B: best };
  const better: Side = spec.bestSide;

  async function guess(side: Side) {
    play("think");
    setPhase({ name: "running", guess: side });
    const runOne = async (s: Side): Promise<Run> => {
      if (!takeLiveRun()) return null;
      const run = await askPipo({ mission, picks: picks[s], client: liveClient, now: () => performance.now() });
      return run.status === "answered" ? { answer: run.answer, score: evaluate(mission, picks[s], run.answer) } : null;
    };
    const [a, b] = await Promise.all([runOne("A"), runOne("B")]);
    play(side === better ? "stars" : "miss", 3);
    setPhase({ name: "reveal", guess: side, runs: { A: a, B: b } });
  }

  const next = () => {
    setRound((r) => (r + 1) % VERSUS_ROUNDS.length);
    setPhase({ name: "choose" });
  };
  const weakSide: Side = better === "A" ? "B" : "A";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-3 p-3 md:px-6 md:py-4">
      <header className="glass flex items-center gap-3 rounded-2xl py-1.5 pr-2 pl-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.lab.backToLab}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl leading-none font-black text-brand-700 hover:bg-white/70"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <span className="min-w-0 truncate text-base font-black text-ink">⚖️ {t.lab.versusTitle}</span>
        <span className="ml-auto shrink-0 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
          {t.lab.round(round + 1, VERSUS_ROUNDS.length)}
        </span>
        <SoundButton compact />
      </header>

      <section className="glass rounded-3xl p-4">
        <p className="text-xs font-black tracking-wide text-brand-700 uppercase">
          {mission.icon} {mission.title}
        </p>
        <p className="mt-1 text-lg leading-snug font-semibold text-ink md:text-xl">{mission.situation}</p>
        {mission.facts.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {mission.facts.map((fact) => (
              <li key={fact} className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-900 ring-1 ring-brand-200">
                {fact}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-base font-black text-ink">{t.lab.question}</p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {(["A", "B"] as const).map((side) => (
          <SideCard
            key={side}
            side={side}
            mission={mission}
            prompt={buildPrompt(mission, picks[side])}
            phase={phase}
            winner={phase.name === "reveal" && side === better}
            onGuess={() => void guess(side)}
          />
        ))}
      </div>

      <div ref={status}>
        {phase.name === "running" && (
        <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-brand-800" role="status">
          <Pipo mood="thinking" className="h-10 w-10" />
          {t.lab.trying}
        </p>
      )}

      {phase.name === "reveal" && (
        <section className={`pop-in rounded-2xl p-4 ${phase.guess === better ? "bg-white/85" : "bg-amber-50/90"}`} aria-live="polite">
          <p className="text-xl font-black text-ink">{phase.guess === better ? t.lab.right : t.lab.wrong}</p>
          {phase.runs[weakSide] && (
            <p className="mt-1 font-bold text-brand-900">
              {t.lab.why} {resultNotes(mission, phase.runs[weakSide]!.score, t.lesson.allGood).slice(0, 2).join(" ")}
            </p>
          )}
          <p className="mt-1 text-sm font-semibold text-gray-600">
            {t.lesson.remember} {mission.lesson}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={next}>
              {round === VERSUS_ROUNDS.length - 1 ? t.lab.playAgain : t.lab.nextRound}
            </Button>
            <Button tone="plain" onClick={onBack}>
              {t.lab.backToLab}
            </Button>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

function SideCard({
  side,
  mission,
  prompt,
  phase,
  winner,
  onGuess,
}: {
  side: Side;
  mission: Mission;
  prompt: string;
  phase: Phase;
  winner: boolean;
  onGuess: () => void;
}) {
  const { t } = useLang();
  const run = phase.name === "reveal" ? phase.runs[side] : null;
  const guessed = phase.name !== "choose" && phase.guess === side;
  return (
    <section
      className={`glass flex flex-col gap-3 rounded-3xl p-3 md:p-4 ${winner ? "ring-4 ring-amber-300" : guessed ? "ring-2 ring-brand-400" : ""}`}
      aria-label={`${side}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">{side}</span>
        {winner && <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-black text-amber-950">🏆 {t.lab.winner}</span>}
        {run && (
          <span className="ml-auto text-lg tracking-widest" aria-label={t.common.starsOf(run.score.stars)}>
            <span className="text-amber-400">{"★".repeat(run.score.stars)}</span>
            <span className="text-gray-300">{"★".repeat(3 - run.score.stars)}</span>
          </span>
        )}
      </div>
      <p className="rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[15px] leading-snug font-semibold text-white">{prompt}</p>

      {phase.name === "choose" && (
        <Button className="w-full" onClick={onGuess}>
          {t.lab.pick(side)}
        </Button>
      )}

      {phase.name === "reveal" &&
        (run ? (
          <ul className="space-y-1.5" aria-label={t.lesson.pipoAnswer}>
            {answerLines(mission, run.score, run.answer).map((line, i) => (
              <li
                key={i}
                className={`pop-in flex items-center gap-2 rounded-xl px-3 py-1.5 text-[15px] leading-snug font-bold ${
                  line.flagged ? "bg-red-50 text-red-900 ring-2 ring-red-300" : "bg-white/90 text-ink"
                }`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <span aria-hidden="true">{line.emoji || "•"}</span>
                {line.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            {t.lesson.tangled}. {t.lesson.tangledSub}
          </p>
        ))}
    </section>
  );
}
