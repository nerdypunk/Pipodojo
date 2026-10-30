// One mission, start to finish: setup -> running -> gate -> result.
import { useState } from "react";
import { runAgent } from "../engine/agentRunner.ts";
import { evaluate } from "../engine/evaluator.ts";
import type { AgentRun, Draft, GateDecision, Mission, RunLog, RunStep, Setup } from "../engine/types.ts";
import { isDebug, liveClient, takeLiveRun } from "../app/liveClient.ts";
import { DebugPanel } from "./DebugPanel.tsx";
import { GateView } from "./GateView.tsx";
import { ResultView } from "./ResultView.tsx";
import { SetupView } from "./SetupView.tsx";
import { TraceView } from "./TraceView.tsx";
import { Button } from "./Button.tsx";

type Phase =
  | { name: "setup" }
  | { name: "running"; steps: RunStep[] }
  | { name: "gate"; setup: Setup; run: AgentRun & { draft: Draft } }
  | { name: "result"; log: RunLog }
  | { name: "failed"; run: AgentRun | null };

export function MissionPlayer({ mission }: { mission: Mission }) {
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [equipped, setEquipped] = useState<string[]>([]);
  const [goalId, setGoalId] = useState<string | null>(null);

  async function go() {
    if (!goalId) return;
    const setup: Setup = { equipped, goalId };
    setPhase({ name: "running", steps: [] });
    if (!takeLiveRun()) {
      setPhase({ name: "failed", run: null });
      return;
    }
    const run = await runAgent({
      mission,
      setup,
      client: liveClient,
      now: () => performance.now(),
      onStep: (step) => setPhase((p) => (p.name === "running" ? { ...p, steps: [...p.steps, step] } : p)),
    });
    if (run.status === "failed" || !run.draft) setPhase({ name: "failed", run });
    else setPhase({ name: "gate", setup, run: { ...run, draft: run.draft } });
  }

  function decide(decision: GateDecision) {
    if (phase.name !== "gate") return;
    const { setup, run } = phase;
    const score = evaluate(mission, setup, run.draft, decision);
    setPhase({
      name: "result",
      log: {
        missionId: mission.id,
        equipped: setup.equipped,
        goalId: setup.goalId,
        steps: run.steps,
        draft: run.draft,
        gateDecision: decision,
        activeFlaws: score.activeFlaws,
        score,
      },
    });
  }

  const tryAgain = () => setPhase({ name: "setup" });

  return (
    <div className="space-y-6">
      {phase.name === "setup" && (
        <SetupView
          mission={mission}
          equipped={equipped}
          goalId={goalId}
          onToggleTool={(id) => setEquipped((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))}
          onChooseGoal={setGoalId}
          onGo={go}
        />
      )}

      {phase.name === "running" && <TraceView mission={mission} steps={phase.steps} working />}

      {phase.name === "gate" && (
        <>
          <TraceView mission={mission} steps={phase.run.steps} />
          <GateView mission={mission} run={phase.run} onDecide={decide} />
        </>
      )}

      {phase.name === "result" && (
        <>
          <ResultView mission={mission} log={phase.log} onTryAgain={tryAgain} />
          {isDebug && <DebugPanel data={phase.log} />}
        </>
      )}

      {phase.name === "failed" && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Pipo got a little tangled up</h2>
          <p>That happens sometimes. Let's give it another go.</p>
          <Button onClick={tryAgain}>Try again</Button>
          {isDebug && <DebugPanel data={phase.run ?? "Session run limit reached"} />}
        </section>
      )}
    </div>
  );
}
