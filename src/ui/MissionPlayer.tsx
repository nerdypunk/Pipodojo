// One lesson on one screen: build the prompt, Check, see Pipo's answer and stars.
import { useState } from "react";
import { askPipo } from "../engine/agentRunner.ts";
import { buildPrompt, emptySlots, isPromptReady, togglePick } from "../engine/brief.ts";
import { evaluate } from "../engine/evaluator.ts";
import type { Mission, PipoRun, RunLog } from "../engine/types.ts";
import { isDebug, liveClient, takeLiveRun } from "../app/liveClient.ts";
import { BriefBuilder, PromptCard } from "./BriefBuilder.tsx";
import { Button } from "./Button.tsx";
import { DebugPanel } from "./DebugPanel.tsx";
import { Pipo } from "./Pipo.tsx";
import { ResultView } from "./ResultView.tsx";

type Phase =
  | { name: "build" }
  | { name: "thinking" }
  | { name: "result"; log: RunLog }
  | { name: "failed"; run: PipoRun | null };

export function MissionPlayer({ mission }: { mission: Mission }) {
  const [phase, setPhase] = useState<Phase>({ name: "build" });
  const [picks, setPicks] = useState<string[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);

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
    setPhase({
      name: "result",
      log: { missionId: mission.id, picks, prompt: run.prompt, answer: run.answer, ms: run.ms, score },
    });
  }

  const tryAgain = () => setPhase({ name: "build" });
  const building = phase.name === "build";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Pipo mood={phase.name === "thinking" ? "thinking" : "idle"} />
        <p className="relative mt-1 flex-1 rounded-2xl border-2 border-gray-200 bg-white p-3">{mission.situation}</p>
      </div>

      {mission.facts.length > 0 && (
        <div className="rounded-2xl bg-sky-50 p-4">
          <p className="mb-1 text-xs font-semibold tracking-wide text-sky-800">What you know</p>
          <ul className="space-y-0.5 text-sky-950">
            {mission.facts.map((fact) => (
              <li key={fact}>• {fact}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-xl font-bold">Build a prompt for Pipo</h2>
      <PromptCard prompt={buildPrompt(mission, picks)} />

      {(building || phase.name === "thinking") && (
        <>
          <BriefBuilder
            mission={mission}
            picks={picks}
            locked={!building}
            onTap={(id) => {
              setNudge(null);
              setPicks((p) => togglePick(mission, p, id));
            }}
          />
          <Button className="w-full" onClick={check} disabled={!building}>
            {building ? "Check" : "Pipo is thinking…"}
          </Button>
          {nudge && <p className="text-center text-sm font-medium text-red-700">{nudge}</p>}
        </>
      )}

      {phase.name === "result" && (
        <>
          <ResultView mission={mission} log={phase.log} onTryAgain={tryAgain} />
          {isDebug && <DebugPanel data={phase.log} />}
        </>
      )}

      {phase.name === "failed" && (
        <section className="space-y-3 rounded-2xl bg-amber-50 p-4">
          <h2 className="text-lg font-bold">Pipo got a little tangled up</h2>
          <p>That happens sometimes. Let's give it another go.</p>
          <Button className="w-full" onClick={tryAgain}>
            Try again
          </Button>
          {isDebug && <DebugPanel data={phase.run ?? "Session run limit reached"} />}
        </section>
      )}
    </div>
  );
}
