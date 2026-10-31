// One lesson on one screen: Pipo's scene on the left, the prompt playground on the right,
// and the Check button / result banner in a bar along the bottom.
import { useState } from "react";
import { askPipo } from "../engine/agentRunner.ts";
import { buildPrompt, emptySlots, filledShare, isPromptReady, togglePick } from "../engine/brief.ts";
import { evaluate } from "../engine/evaluator.ts";
import type { Mission, PipoRun, RunLog } from "../engine/types.ts";
import { answerLines } from "../game/feedback.ts";
import { isDebug, liveClient, takeLiveRun } from "../app/liveClient.ts";
import { ActionBar } from "./ActionBar.tsx";
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
  const building = phase.name === "build";
  const result = phase.name === "result" ? phase.log : null;
  const mood = phase.name === "thinking" ? "thinking" : result ? (result.score.stars === 1 ? "oops" : "happy") : "idle";

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar progress={result ? 1 : filledShare(mission, picks)} stars={bestStars} />

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-6 px-4 pb-6 md:grid-cols-[5fr_6fr] md:items-start md:gap-10 md:px-8 md:pb-10">
        <PipoScene
          mission={mission}
          mood={mood}
          thinking={phase.name === "thinking"}
          answer={result ? answerLines(mission, result.score, result.answer) : null}
        />

        <section
          className={`space-y-6 rounded-3xl bg-paper p-4 transition-opacity md:p-7 ${building ? "" : "opacity-60"}`}
          aria-label="Build your message to Pipo"
        >
          <PromptCard prompt={buildPrompt(mission, picks)} />
          <BriefBuilder
            mission={mission}
            picks={picks}
            locked={!building}
            onTap={(id) => {
              setNudge(null);
              setPicks((p) => togglePick(mission, p, id));
            }}
          />
        </section>

        {isDebug && (result || phase.name === "failed") && (
          <div className="md:col-span-2">
            <DebugPanel data={result ?? (phase.name === "failed" ? (phase.run ?? "Session run limit reached") : null)} />
          </div>
        )}
      </main>

      {phase.name === "build" && <ActionBar state="build" nudge={nudge} onCheck={check} />}
      {phase.name === "thinking" && <ActionBar state="thinking" />}
      {result && <ActionBar state="result" mission={mission} score={result.score} onTryAgain={tryAgain} />}
      {phase.name === "failed" && <ActionBar state="failed" onTryAgain={tryAgain} />}
    </div>
  );
}
