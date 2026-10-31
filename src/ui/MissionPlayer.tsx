// One lesson on one screen: Pipo's scene on the left, the prompt playground on the right,
// with Check and the result at the foot of the playground card.
import { useState } from "react";
import { askPipo } from "../engine/agentRunner.ts";
import { buildPrompt, emptySlots, filledShare, isPromptReady, togglePick } from "../engine/brief.ts";
import { evaluate } from "../engine/evaluator.ts";
import type { Mission, PipoRun, RunLog } from "../engine/types.ts";
import { answerLines } from "../game/feedback.ts";
import { isDebug, liveClient, takeLiveRun } from "../app/liveClient.ts";
import { ActionBar } from "./ActionBar.tsx";
import { Backdrop } from "./Backdrop.tsx";
import { BriefBuilder, PromptCard } from "./BriefBuilder.tsx";
import { DebugPanel } from "./DebugPanel.tsx";
import { PipoScene } from "./PipoScene.tsx";
import { TopBar } from "./TopBar.tsx";

type Phase =
  | { name: "build" }
  | { name: "thinking" }
  | { name: "result"; log: RunLog }
  | { name: "failed"; run: PipoRun | null };

export function MissionPlayer({ mission }: { mission: Mission }) {
  const [phase, setPhase] = useState<Phase>({ name: "build" });
  const [picks, setPicks] = useState<string[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);
  const [bestStars, setBestStars] = useState(0);

  async function check() {
    if (!isPromptReady(mission, picks)) {
      const missing = emptySlots(mission, picks).map((s) => `"${s.label}"`);
      setNudge(`Pick a piece for ${missing.join(" and ")} first.`);
      return;
    }
    setNudge(null);
    setPhase({ name: "thinking" });
    if (!takeLiveRun()) {
      setPhase({ name: "failed", run: null });
      return;
    }
    const run = await askPipo({ mission, picks, client: liveClient, now: () => performance.now() });
    if (run.status === "failed") {
      setPhase({ name: "failed", run });
      return;
    }
    const score = evaluate(mission, picks, run.answer);
    setBestStars((best) => Math.max(best, score.stars));
    setPhase({
      name: "result",
      log: { missionId: mission.id, picks, prompt: run.prompt, answer: run.answer, ms: run.ms, score },
    });
  }

  const tryAgain = () => setPhase({ name: "build" });
  const thinking = phase.name === "thinking";
  const result = phase.name === "result" ? phase.log : null;
  const mood = thinking ? "thinking" : result ? (result.score.stars === 1 ? "oops" : "happy") : "idle";
  // Pieces stay on screen while building and thinking; the result takes their place after.
  const showPieces = phase.name === "build" || thinking;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-4 p-3 md:p-6">
      <Backdrop />
      <TopBar progress={result ? 1 : filledShare(mission, picks)} stars={bestStars} />

      <main className="grid gap-4 md:grid-cols-[5fr_6fr] md:items-start md:gap-5">
        <PipoScene
          mission={mission}
          mood={mood}
          thinking={thinking}
          answer={result ? answerLines(mission, result.score, result.answer) : null}
        />

        <section className="glass flex flex-col gap-4 rounded-3xl p-4 md:p-5" aria-label="Build your message to Pipo">
          <PromptCard prompt={buildPrompt(mission, picks)} />
          {showPieces && (
            <div className={thinking ? "pointer-events-none opacity-60" : ""} aria-disabled={thinking}>
              <BriefBuilder
                mission={mission}
                picks={picks}
                onTap={(id) => {
                  setNudge(null);
                  setPicks((p) => togglePick(mission, p, id));
                }}
              />
            </div>
          )}
          <div className="mt-auto">
            {phase.name === "build" && <ActionBar state="build" nudge={nudge} onCheck={check} />}
            {thinking && <ActionBar state="thinking" />}
            {result && <ActionBar state="result" mission={mission} score={result.score} onTryAgain={tryAgain} />}
            {phase.name === "failed" && <ActionBar state="failed" onTryAgain={tryAgain} />}
          </div>
        </section>

        {isDebug && (result || phase.name === "failed") && (
          <div className="md:col-span-2">
            <DebugPanel data={result ?? (phase.name === "failed" ? (phase.run ?? "Session run limit reached") : null)} />
          </div>
        )}
      </main>
    </div>
  );
}
