// One lesson on one screen: Pipo's scene on the left, the prompt playground on the right,
// with Check and the result at the foot of the playground card.
import { useEffect, useRef, useState } from "react";
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

export function MissionPlayer({ mission, onBack }: { mission: Mission; onBack: () => void }) {
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
  const locked = phase.name !== "build";

  // On phones Pipo's answer is above the fold once Check is pressed: bring it into view.
  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result || !window.matchMedia("(max-width: 767px)").matches) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sceneRef.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [result]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-3 p-3 md:px-6 md:py-4">
      <Backdrop />
      <TopBar progress={result ? 1 : filledShare(mission, picks)} stars={bestStars} onBack={onBack} />

      {/* Both cards stretch to the same height; the pieces stay put so nothing jumps after Check. */}
      <main className="grid gap-3 md:grid-cols-[5fr_6fr] md:gap-5">
        <div ref={sceneRef} className="flex scroll-mt-3 flex-col">
          <PipoScene
            mission={mission}
            mood={mood}
            stage={thinking ? "thinking" : result ? "done" : "idle"}
            stars={result ? result.score.stars : null}
            answer={result ? answerLines(mission, result.score, result.answer) : null}
          />
        </div>

        <section
          className="glass flex flex-col gap-3 rounded-3xl p-3 md:gap-4 md:p-5"
          aria-label="Build your message to Pipo"
        >
          <PromptCard prompt={buildPrompt(mission, picks)} />
          {/* Locked while Pipo thinks (the glow stays bright), faded once the answer is in.
              On phones the faded pieces are hidden so the result sits right under the message. */}
          <div
            className={`transition-opacity motion-reduce:transition-none ${locked ? "pointer-events-none" : ""} ${
              result || phase.name === "failed" ? "max-md:hidden md:opacity-60" : ""
            }`}
            aria-disabled={locked}
          >
            <BriefBuilder
              mission={mission}
              picks={picks}
              mode={thinking ? "thinking" : result ? "done" : "build"}
              onTap={(id) => {
                setNudge(null);
                setPicks((p) => togglePick(mission, p, id));
              }}
            />
          </div>
          {/* On phones, Check stays pinned to the bottom of the screen while you build. */}
          <div
            className={`mt-auto ${
              phase.name === "build" || thinking
                ? "max-md:glass max-md:sticky max-md:bottom-3 max-md:z-20 max-md:-mx-1 max-md:rounded-2xl max-md:px-3 max-md:pb-3"
                : ""
            }`}
          >
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
