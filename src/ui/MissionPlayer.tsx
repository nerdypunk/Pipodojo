// One lesson on one screen: Pipo's scene on the left, the prompt playground on the right,
// with Check and the result at the foot of the playground card.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { approveAction, askPipo } from "../engine/agentRunner.ts";
import { buildPrompt, emptySlots, filledShare, isPromptReady, togglePick } from "../engine/brief.ts";
import { evaluate } from "../engine/evaluator.ts";
import { recordingClient, type CallRecord } from "../engine/trace.ts";
import type { Mission, ModelClient, PipoAction, PipoRun, RunLog } from "../engine/types.ts";
import { answerLines } from "../game/feedback.ts";
import { isDebug, liveClient, takeLiveRun } from "../app/liveClient.ts";
import { ActionBar, MessageBubble } from "./ActionBar.tsx";
import { BriefBuilder } from "./BriefBuilder.tsx";
import { LessonTutorial, tutorialPending } from "./LessonTutorial.tsx";
import { MessageCube } from "./MessageCube.tsx";
import { DebugPanel } from "./DebugPanel.tsx";
import { celebrate, FloatingPhone, type PhoneStatus } from "./FloatingPhone.tsx";
import { PipoScene } from "./PipoScene.tsx";
import { ShaderBorder } from "./ShaderBorder.tsx";
import { TopBar } from "./TopBar.tsx";
import { UnderTheHood } from "./UnderTheHood.tsx";
import { useLang } from "../i18n/index.tsx";
import { play } from "../app/sound.ts";

type Phase =
  | { name: "build" }
  | { name: "thinking" }
  | { name: "result"; log: RunLog }
  | { name: "failed"; run: PipoRun | null };

/** Used for Send / Pay when the session's live calls are used up: the action finishes locally. */
const offline: ModelClient = {
  complete: () => Promise.reject(new Error("No live calls left")),
};

interface Props {
  mission: Mission;
  /** Where this lesson sits in its path, e.g. 2 of 3. */
  lesson: { number: number; total: number };
  /** After a result: the player moves on with this run (to the lesson complete screen). */
  onFinish: (log: RunLog) => void;
  onBack: () => void;
  /** Another way to make the message instead of the rows of pieces (Pick a prompt). */
  picker?: (props: PickerProps) => ReactNode;
}

export interface PickerProps {
  picks: readonly string[];
  /** Sets the whole message at once (e.g. one of two finished messages). */
  choose: (picks: string[]) => void;
  /** Pipo has answered (or failed): show what was picked, take no more taps. */
  done: boolean;
  /** The first-time tour is open over the lesson: hold any timers. */
  paused: boolean;
}

export function MissionPlayer({ mission, lesson, onFinish, onBack, picker }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: "build" });
  const { t } = useLang();
  const [picks, setPicks] = useState<string[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);
  const [bestStars, setBestStars] = useState(0);
  // Pipo's floating phone, after Pipo acts in an app (lessons with tools).
  const [phone, setPhone] = useState<{ action: PipoAction; status: PhoneStatus; open: boolean } | null>(null);
  // Every real model call this attempt, for the under-the-hood timeline.
  const [calls, setCalls] = useState<CallRecord[]>([]);
  // The first-time tour, on whichever lesson a player opens first (see LessonTutorial).
  const [touring, setTouring] = useState(tutorialPending);
  const buildRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const traced = (client: ModelClient) => recordingClient(client, () => performance.now(), (call) => setCalls((c) => [...c, call]));

  async function check() {
    if (!isPromptReady(mission, picks)) {
      const missing = emptySlots(mission, picks).map((s) => `"${s.label}"`);
      setNudge(picker ? t.lesson.chooseNudge : t.lesson.nudge(missing));
      return;
    }
    setNudge(null);
    setCalls([]);
    setPhase({ name: "thinking" });
    play("think");
    if (!takeLiveRun()) {
      setPhase({ name: "failed", run: null });
      play("miss");
      return;
    }
    const run = await askPipo({ mission, picks, client: traced(liveClient), now: () => performance.now() });
    if (run.status === "failed") {
      setPhase({ name: "failed", run });
      play("miss");
      return;
    }
    const score = evaluate(mission, picks, run.answer);
    // One chime per star; a gentle "hmm" when a gap showed up.
    if (score.stars === 1) play("miss");
    else play("stars", score.stars);
    setBestStars((best) => Math.max(best, score.stars));
    setPhone(run.action ? { action: run.action, status: run.action.outcome === "done" ? "already" : "review", open: true } : null);
    setPhase({
      name: "result",
      log: {
        missionId: mission.id,
        picks,
        prompt: run.prompt,
        answer: run.answer,
        ...(run.action ? { action: run.action } : {}),
        ms: run.ms,
        score,
      },
    });
  }

  const tap = (id: string) => {
    setNudge(null);
    setPicks((p) => togglePick(mission, p, id));
  };

  const tryAgain = () => {
    setPhone(null);
    setCalls([]);
    setPhase({ name: "build" });
  };

  // Send / Pay on the phone: Pipo is asked to go ahead and finishes the action itself.
  async function approve() {
    if (!phone || phone.status !== "review" || !result) return;
    setPhone({ ...phone, status: "working" });
    const client = traced(takeLiveRun() ? liveClient : offline);
    const done = await approveAction({ mission, prompt: result.prompt, action: phone.action, client });
    setPhone((p) => (p ? { ...p, action: done, status: "approved" } : p));
    celebrate(done.app);
  }
  const thinking = phase.name === "thinking";
  const result = phase.name === "result" ? phase.log : null;
  const mood = thinking ? "thinking" : result ? (result.score.stars === 1 ? "oops" : "happy") : "idle";
  const locked = phase.name !== "build";
  // A soft animated glow sits behind both big cards and follows what Pipo is doing.
  const borderMode = thinking ? "thinking" : result ? "done" : "build";

  // On phones Pipo's answer is above the fold once Check is pressed: bring it into view.
  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result || !window.matchMedia("(max-width: 767px)").matches) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sceneRef.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [result]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-3 p-3 md:px-6 md:py-4">
      <TopBar progress={result ? 1 : filledShare(mission, picks)} stars={bestStars} onBack={onBack} lesson={lesson} />

      {/* Both cards stretch to the same height; the pieces stay put so nothing jumps after Check. */}
      <main className="grid gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-5">
        <div ref={sceneRef} className="flex min-w-0 scroll-mt-3 flex-col">
          <ShaderBorder mode={borderMode} className="flex flex-1 flex-col">
            <PipoScene
              mission={mission}
              mood={mood}
              stage={thinking ? "thinking" : result ? "done" : "idle"}
              stars={result ? result.score.stars : null}
              answer={result ? answerLines(mission, result.score, result.answer) : null}
              action={phone?.action}
              onOpenPhone={phone && !phone.open ? () => setPhone({ ...phone, open: true }) : undefined}
            />
          </ShaderBorder>
        </div>

        <ShaderBorder mode={borderMode} roundness={0.08} className="flex flex-col">
          <section
            ref={buildRef}
            className="glass relative flex flex-1 flex-col gap-3 rounded-3xl p-3 md:gap-4 md:p-5"
            aria-label={t.lesson.buildMessage}
          >
            {/* The pieces come first; the message they make sits at the foot, next to Check, like a
                chat app. A picker shows its own heading and finished messages. */}
            {!picker && (
              <div>
                <p className="text-base font-black text-ink md:text-lg">{t.lesson.buildMessage}</p>
                <p className="text-sm font-semibold text-gray-600">{t.lesson.tapPieces}</p>
              </div>
            )}
            {/* Locked while Pipo thinks (the glow stays bright), faded once the answer is in.
                On phones the faded pieces are hidden so the result sits right under the message. */}
            <div
              className={`transition-opacity motion-reduce:transition-none ${locked ? "pointer-events-none" : ""} ${
                result || phase.name === "failed" ? "max-md:hidden md:opacity-60" : ""
              }`}
              aria-disabled={locked}
            >
              {picker ? (
                picker({
                  picks,
                  choose: (next) => {
                    setNudge(null);
                    setPicks(next);
                  },
                  done: !!result || phase.name === "failed",
                  paused: touring,
                })
              ) : (
                <BriefBuilder mission={mission} picks={picks} onlyPicked={!!result || phase.name === "failed"} onTap={tap} />
              )}
            </div>
            {/* On phones, the message and Check stay pinned to the bottom of the screen while you build. */}
            <div
              ref={composerRef}
              className={`mt-auto ${
                phase.name === "build" || thinking
                  ? "max-md:glass pointer-coarse:bg-white/95 max-md:sticky max-md:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:z-20 max-md:-mx-1 max-md:rounded-2xl max-md:px-3 max-md:pb-3"
                  : ""
              }`}
            >
              {phase.name === "build" && (
                <ActionBar
                  state="build"
                  nudge={nudge}
                  onCheck={check}
                  message={buildPrompt(mission, picks)}
                  empty={picker ? t.lesson.pickEmpty : t.lesson.buildEmpty}
                />
              )}
              {thinking && <ActionBar state="thinking" message={buildPrompt(mission, picks)} />}
              {/* After Check, the message that was sent stays in view above the result. */}
              {result && (
                <div className="mb-3 space-y-1.5">
                  <p className="text-xs font-black tracking-wide text-brand-700 uppercase">{t.lesson.yourMessage}</p>
                  <MessageBubble text={buildPrompt(mission, picks)} empty="" />
                </div>
              )}
              {result && <ActionBar state="result" mission={mission} score={result.score} onTryAgain={tryAgain} next={{ label: t.common.continue, onGo: () => onFinish(result) }} />}
              {phase.name === "failed" && <ActionBar state="failed" onTryAgain={tryAgain} />}
            </div>
            {/* The 3D message cube, in the card's empty corner (computers only, never over words). Not for
                "pick a message" lessons: there are no pieces to build with there. */}
            {!picker && (
              <MessageCube
                mission={mission}
                picks={picks}
                stage={phase.name === "build" ? "build" : thinking ? "assemble" : "done"}
                stars={result ? result.score.stars : null}
                hidden={!!phone?.open}
              />
            )}
          </section>
        </ShaderBorder>

        {isDebug && (result || phase.name === "failed") && (
          <div className="md:col-span-2">
            <DebugPanel data={result ?? (phase.name === "failed" ? (phase.run ?? "Session run limit reached") : null)} />
          </div>
        )}
      </main>

      <UnderTheHood
        mission={mission}
        prompt={buildPrompt(mission, picks)}
        calls={calls}
        waiting={thinking || phone?.status === "working"}
        score={result?.score ?? null}
      />

      {touring && (
        <LessonTutorial
          steps={[
            { target: sceneRef, title: t.tutorial.situationTitle, text: t.tutorial.situation },
            { target: buildRef, title: picker ? t.tutorial.pickTitle : t.tutorial.buildTitle, text: picker ? t.tutorial.pick : t.tutorial.build },
            { target: composerRef, title: t.tutorial.checkTitle, text: picker ? t.tutorial.checkPick : t.tutorial.checkBuild },
          ]}
          onDone={() => setTouring(false)}
        />
      )}

      {phone && result && (
        <FloatingPhone
          action={phone.action}
          flags={answerLines(mission, result.score, result.answer).map((line) => line.flagged)}
          status={phone.status}
          open={phone.open}
          onOpen={() => setPhone({ ...phone, open: true })}
          onClose={() => setPhone({ ...phone, open: false })}
          onApprove={() => void approve()}
        />
      )}
    </div>
  );
}
