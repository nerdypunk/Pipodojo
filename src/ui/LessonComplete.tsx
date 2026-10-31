// A box on the dark page-sweep panel, shown between lessons and after the last one. One compact
// column, read top to bottom: the celebration, what Pipo got done, what you learned, where you
// are on the path, and Continue (which sweeps the panel away into the next lesson).
import confetti from "canvas-confetti";
import { useEffect } from "react";
import type { Postcard } from "../app/postcard.ts";
import type { Mission, RunLog } from "../engine/types.ts";
import { answerLines } from "../game/feedback.ts";
import { Button } from "./Button.tsx";
import { PeelReward } from "./PeelReward.tsx";
import { Pipo } from "./Pipo.tsx";

interface Props {
  pathName: string;
  lessons: readonly Mission[];
  /** The lesson just finished. */
  index: number;
  log: RunLog;
  /** Best stars per lesson id this session. */
  stars: Readonly<Record<string, number>>;
  /** Painted at the end of a path, from the player's runs. */
  postcard: Postcard | null;
  onContinue: () => void;
  onBack: () => void;
}

/** Let the box pop in before the confetti starts. */
const CONFETTI_DELAY_MS = 250;

export function LessonComplete({ pathName, lessons, index, log, stars, postcard, onContinue, onBack }: Props) {
  const mission = lessons[index]!;
  const next = lessons[index + 1];
  const won = log.score.stars;

  useEffect(() => {
    if (won < 2) return;
    const timer = window.setTimeout(() => {
      void confetti({
        particleCount: won === 3 ? 140 : 70,
        spread: 80,
        origin: { y: 0.3 },
        colors: ["#6e5cf2", "#8c7dfb", "#9cc2ff", "#fbbf24", "#ff7a1a"],
        disableForReducedMotion: true,
      });
    }, CONFETTI_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [won]);

  return (
    // Sits on top of the dark page-sweep panel, which stays put until Continue sweeps it away.
    <div className="fixed inset-0 z-[10000] flex overflow-y-auto p-3 md:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-complete-title"
        className="pop-in m-auto flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]"
      >
        {/* 1. Celebration */}
        <div className="flex items-center gap-4 bg-[linear-gradient(115deg,#4936bd_0%,#5a46e0_45%,#8c7dfb_100%)] px-5 py-4 text-white">
          <Pipo
            mood={won === 1 ? "oops" : "happy"}
            className="h-16 w-16 shrink-0 drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
          />
          <div>
            <p id="lesson-complete-title" className="text-xl font-black md:text-2xl">
              Lesson {index + 1} complete!
            </p>
            <p className="flex gap-1 text-3xl leading-none" aria-label={`${won} out of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`pop-in ${n <= won ? "text-amber-300 drop-shadow-[0_0_10px_rgb(252_211_77/0.6)]" : "text-white/20"}`}
                  style={{ animationDelay: `${300 + n * 180}ms` }}
                  aria-hidden="true"
                >
                  ★
                </span>
              ))}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* 2. The main point between lessons: what agents can do, and where the path goes next */}
          {mission.funFact && (
            <section
              className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-sky-50 to-brand-50 p-4 ring-2 ring-sky-200"
              aria-label="Did you know?"
            >
              <Pipo mood="happy" className="h-14 w-14 shrink-0 drop-shadow-[0_6px_12px_rgb(45_36_112/0.25)]" />
              <div>
                <p className="text-lg font-black text-sky-900">Did you know?</p>
                <p className="text-base leading-snug font-semibold text-ink md:text-[17px]">{mission.funFact}</p>
              </div>
            </section>
          )}

          {/* 3. What Pipo got done, folded into one line; opens by itself after a miss so the red line shows */}
          <details className="group rounded-xl bg-brand-50 px-3 py-2" open={won === 1}>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true">{mission.icon ?? "✅"}</span>
              <span className="flex-1">{mission.recap ?? mission.title}</span>
              <span className="text-xs font-extrabold text-brand-700">
                <span className="group-open:hidden">See answer</span>
                <span className="hidden group-open:inline">Hide</span>
              </span>
            </summary>
            <ul className="mt-2 space-y-1">
              {answerLines(mission, log.score, log.answer).map((line, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm leading-snug font-bold ${
                    line.flagged ? "bg-red-50 text-red-900 ring-2 ring-red-300" : "bg-white text-ink"
                  }`}
                >
                  <span aria-hidden="true">{line.emoji || "•"}</span>
                  {line.text}
                </li>
              ))}
            </ul>
          </details>

          {/* What you learned, as one small line */}
          <p className="-mt-2 px-1 text-sm font-semibold text-gray-600">
            <span aria-hidden="true">💡 </span>
            {mission.lesson}
          </p>

          {/* 4. Where you are on the path */}
          <section className="rounded-2xl bg-brand-50/70 px-4 py-3" aria-label="Your path">
            <p className="text-sm font-extrabold text-gray-600">
              {pathName} path · {next ? <span className="text-ink">Up next: {next.title}</span> : <span className="text-ink">Path complete!</span>}
            </p>
            {next ? (
              <PathSteps lessons={lessons} doneUpTo={index} stars={stars} />
            ) : (
              // The path is done: the reward chest becomes a gift you peel open.
              <div className="mt-3">
                <PeelReward
                  pathName={pathName}
                  lessons={lessons.length}
                  stars={lessons.reduce((sum, lesson) => sum + (stars[lesson.id] ?? 0), 0)}
                  postcard={postcard}
                />
              </div>
            )}
          </section>

          {/* 5. Move on */}
          <div className="flex gap-2">
            <Button tone="plain" className="flex-1 sm:flex-none" onClick={onBack}>
              Back to paths
            </Button>
            {next && (
              <Button className="flex-1" onClick={onContinue} autoFocus>
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The path as a row of steps joined by a line: done, next (glowing), locked, then the reward. */
function PathSteps({
  lessons,
  doneUpTo,
  stars,
}: {
  lessons: readonly Mission[];
  doneUpTo: number;
  stars: Readonly<Record<string, number>>;
}) {
  const allDone = doneUpTo >= lessons.length - 1;
  return (
    <ol className="mt-3 flex items-start" aria-label="Lessons in this path">
      {lessons.map((lesson, i) => {
        const state = i <= doneUpTo ? "done" : i === doneUpTo + 1 ? "next" : "locked";
        return (
          <Step
            key={lesson.id}
            label={lesson.title}
            state={state}
            stars={stars[lesson.id] ?? 0}
            icon={lesson.icon}
            ariaLabel={`Lesson ${i + 1}: ${lesson.title}, ${state === "done" ? `done, ${stars[lesson.id] ?? 0} stars` : state === "next" ? "up next" : "locked"}`}
            lineDone={i <= doneUpTo}
          />
        );
      })}
      <Step
        label={allDone ? "Reward!" : "Reward"}
        state={allDone ? "reward" : "locked-reward"}
        stars={0}
        ariaLabel={allDone ? "Path reward unlocked" : "Path reward, locked"}
        last
      />
    </ol>
  );
}

type StepState = "done" | "next" | "locked" | "reward" | "locked-reward";

function Step({
  label,
  state,
  stars,
  icon,
  ariaLabel,
  lineDone = false,
  last = false,
}: {
  label: string;
  state: StepState;
  stars: number;
  icon?: string;
  ariaLabel: string;
  lineDone?: boolean;
  last?: boolean;
}) {
  const circle: Record<StepState, string> = {
    done: "border-brand-800 bg-brand-600 text-white",
    next: "border-brand-700 bg-brand-500 text-white ring-4 ring-brand-200",
    locked: "border-gray-400 bg-gray-200 text-gray-500",
    reward: "border-amber-600 bg-amber-300",
    "locked-reward": "border-gray-400 bg-gray-200 grayscale",
  };
  const glyph =
    state === "done" ? "✓" : state === "next" ? (icon ?? "★") : state === "locked" ? "🔒" : state === "reward" ? "🏆" : "🎁";

  return (
    <li className="relative flex flex-1 flex-col items-center text-center" aria-label={ariaLabel}>
      {/* Line to the next step */}
      {!last && (
        <span
          className={`absolute top-5 left-1/2 h-1 w-full rounded-full ${lineDone ? "bg-brand-500" : "bg-gray-200"}`}
          aria-hidden="true"
        />
      )}
      <span className="relative" aria-hidden="true">
        {state === "next" && (
          <span className="absolute -inset-1.5 animate-ping rounded-full bg-brand-300/50 motion-reduce:animate-none" />
        )}
        <span
          className={`relative flex h-10 w-10 items-center justify-center rounded-full border-b-4 text-lg font-black ${circle[state]}`}
        >
          {glyph}
        </span>
      </span>
      <span
        className={`mt-1 px-1 text-xs leading-tight font-extrabold ${state === "locked" || state === "locked-reward" ? "text-gray-500" : "text-ink"}`}
        aria-hidden="true"
      >
        {label}
      </span>
      {state === "done" && (
        <span className="text-xs tracking-wider" aria-hidden="true">
          <span className="text-amber-400">{"★".repeat(stars)}</span>
          <span className="text-gray-300">{"★".repeat(3 - stars)}</span>
        </span>
      )}
      {state === "next" && (
        <span className="mt-0.5 rounded-md bg-ink px-1.5 py-px text-[10px] font-black tracking-wider text-white uppercase" aria-hidden="true">
          Start
        </span>
      )}
    </li>
  );
}
