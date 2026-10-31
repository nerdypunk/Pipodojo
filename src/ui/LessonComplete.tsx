// Shown between lessons (behind the page sweep) and after the last one: what Pipo got done,
// your stars, what you learned, and the path so far: finished, next, locked, and the reward.
import confetti from "canvas-confetti";
import { useEffect } from "react";
import type { Mission, RunLog } from "../engine/types.ts";
import { answerLines } from "../game/feedback.ts";
import { Button } from "./Button.tsx";
import { Pipo } from "./Pipo.tsx";
import { ShaderBorder } from "./ShaderBorder.tsx";

interface Props {
  pathName: string;
  lessons: readonly Mission[];
  /** The lesson just finished. */
  index: number;
  log: RunLog;
  /** Best stars per lesson id this session. */
  stars: Readonly<Record<string, number>>;
  onContinue: () => void;
  onBack: () => void;
}

/** Wait for the page sweep to clear before the confetti starts. */
const CONFETTI_DELAY_MS = 650;

export function LessonComplete({ pathName, lessons, index, log, stars, onContinue, onBack }: Props) {
  const mission = lessons[index]!;
  const next = lessons[index + 1];
  const won = log.score.stars;

  useEffect(() => {
    if (won < 2) return;
    const timer = window.setTimeout(() => {
      void confetti({
        particleCount: won === 3 ? 140 : 70,
        spread: 80,
        origin: { y: 0.35 },
        colors: ["#6e5cf2", "#8c7dfb", "#9cc2ff", "#fbbf24", "#ff7a1a"],
        disableForReducedMotion: true,
      });
    }, CONFETTI_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [won]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-3 p-3 md:px-6 md:py-4">
      <header className="glass flex items-center gap-3 rounded-2xl py-1.5 pr-4 pl-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to paths"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl leading-none font-black text-brand-700 transition hover:bg-white/70 focus-visible:outline-3 focus-visible:outline-brand-500"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <span className="hidden text-lg font-black tracking-tight text-brand-700 sm:inline">Pipodojo</span>
        <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-extrabold text-white">{pathName}</span>
      </header>

      <main className="grid gap-3 md:grid-cols-[5fr_6fr] md:gap-5">
        <ShaderBorder mode="done" className="flex flex-col">
          <Summary mission={mission} log={log} lessonNumber={index + 1} />
        </ShaderBorder>

        <ShaderBorder mode="build" roundness={0.08} className="flex flex-col">
          <section className="glass flex flex-1 flex-col gap-4 rounded-3xl p-4 md:p-5" aria-label="Your path">
            <div>
              <p className="text-sm font-extrabold text-gray-600">Your path</p>
              <h2 className="text-2xl font-black text-ink">{next ? `Up next: ${next.title}` : "Path complete!"}</h2>
            </div>
            <PathMap lessons={lessons} doneUpTo={index} stars={stars} />
            <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button tone="plain" className="w-full sm:w-auto" onClick={onBack}>
                Back to paths
              </Button>
              {next && (
                <Button className="w-full sm:w-56" onClick={onContinue}>
                  Start lesson {index + 2}
                </Button>
              )}
            </div>
          </section>
        </ShaderBorder>
      </main>
    </div>
  );
}

function Summary({ mission, log, lessonNumber }: { mission: Mission; log: RunLog; lessonNumber: number }) {
  const won = log.score.stars;
  return (
    <section className="glass flex flex-1 flex-col gap-3 rounded-3xl p-3 md:p-4" aria-label="Lesson complete">
      {/* Celebration: Pipo and the stars you earned */}
      <div className="relative flex flex-col items-center gap-1 rounded-2xl bg-[radial-gradient(circle_at_50%_40%,#5a46e0_0%,#2d2470_55%,#1b1640_100%)] px-4 py-4 text-white">
        <Pipo mood={won === 1 ? "oops" : "happy"} className="h-20 w-20 drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] md:h-24 md:w-24" />
        <p className="flex gap-1.5 text-4xl" aria-label={`${won} out of 3 stars`}>
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
        <p className="text-xl font-black">Lesson {lessonNumber} complete!</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            {mission.icon ?? "✅"}
          </span>
          <h1 className="text-2xl leading-tight font-black text-ink">{mission.title}</h1>
        </div>
        {mission.recap && <p className="text-lg leading-snug font-semibold text-ink">{mission.recap}</p>}

        <div>
          <p className="mb-1.5 text-sm font-extrabold text-gray-600">What Pipo did</p>
          <ul className="space-y-1.5">
            {answerLines(mission, log.score, log.answer).map((line, i) => (
              <li
                key={i}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[15px] leading-snug font-bold ${
                  line.flagged ? "bg-red-50 text-red-900 ring-2 ring-red-300" : "bg-brand-50"
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  {line.emoji || "•"}
                </span>
                {line.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-auto rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
          <span aria-hidden="true">💡 </span>
          {mission.lesson}
        </p>
      </div>
    </section>
  );
}

/** Zig-zag path of round nodes, like a game map: done, next (glowing, with Pipo), locked, reward. */
function PathMap({
  lessons,
  doneUpTo,
  stars,
}: {
  lessons: readonly Mission[];
  doneUpTo: number;
  stars: Readonly<Record<string, number>>;
}) {
  const allDone = doneUpTo >= lessons.length - 1;
  const offsets = ["md:-translate-x-10", "md:translate-x-10", "md:-translate-x-6", "md:translate-x-6"];

  return (
    <ol className="flex flex-col items-center gap-5 py-2" aria-label="Lessons in this path">
      {lessons.map((lesson, i) => {
        const state = i <= doneUpTo ? "done" : i === doneUpTo + 1 ? "next" : "locked";
        return (
          <li key={lesson.id} className={`relative flex flex-col items-center ${offsets[i % offsets.length]}`}>
            <PathNode lesson={lesson} state={state} stars={stars[lesson.id] ?? 0} number={i + 1} />
          </li>
        );
      })}
      <li className={`flex flex-col items-center ${offsets[lessons.length % offsets.length]}`}>
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border-b-[6px] text-3xl ${
            allDone ? "border-amber-600 bg-amber-300" : "border-gray-400 bg-gray-300 grayscale"
          }`}
          aria-label={allDone ? "Path reward unlocked" : "Path reward, locked"}
        >
          <span aria-hidden="true">{allDone ? "🏆" : "🎁"}</span>
        </div>
        <span className="mt-1 text-xs font-extrabold text-gray-600">{allDone ? "Reward unlocked!" : "Path reward"}</span>
      </li>
    </ol>
  );
}

function PathNode({
  lesson,
  state,
  stars,
  number,
}: {
  lesson: Mission;
  state: "done" | "next" | "locked";
  stars: number;
  number: number;
}) {
  const label = `Lesson ${number}: ${lesson.title}, ${state === "done" ? `done, ${stars} stars` : state === "next" ? "up next" : "locked"}`;
  return (
    <>
      {state === "next" && (
        <span className="mb-2 rounded-xl bg-ink px-3 py-1 text-xs font-black tracking-wider text-white uppercase shadow">
          Start
        </span>
      )}
      <div className="relative" aria-label={label} role="img">
        {state === "next" && (
          <span
            className="absolute -inset-2 animate-ping rounded-full bg-brand-300/60 motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-b-[6px] text-2xl font-black ${
            state === "done"
              ? "border-brand-800 bg-brand-600 text-white"
              : state === "next"
                ? "border-brand-700 bg-brand-500 text-white ring-4 ring-white"
                : "border-gray-400 bg-gray-300 text-gray-500"
          }`}
        >
          <span aria-hidden="true">{state === "done" ? "✓" : state === "next" ? (lesson.icon ?? "★") : "🔒"}</span>
        </div>
        {/* Pipo waits next to the lesson that's up next */}
        {state === "next" && (
          <Pipo mood="happy" className="absolute top-0 left-full ml-4 h-14 w-14 drop-shadow-[0_6px_12px_rgb(45_36_112/0.35)]" />
        )}
      </div>
      <span className={`mt-1 text-sm font-extrabold ${state === "locked" ? "text-gray-500" : "text-ink"}`}>
        {lesson.title}
      </span>
      {state === "done" && (
        <span className="text-sm tracking-wider" aria-hidden="true">
          <span className="text-amber-400">{"★".repeat(stars)}</span>
          <span className="text-gray-300">{"★".repeat(3 - stars)}</span>
        </span>
      )}
    </>
  );
}
