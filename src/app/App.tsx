import { useState } from "react";
import type { Persona, RunLog } from "../engine/types.ts";
import { PERSONAS } from "../game/personas.ts";
import { Backdrop } from "../ui/Backdrop.tsx";
import { LessonComplete } from "../ui/LessonComplete.tsx";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { TransitionOverlay, usePageTransition } from "../ui/PageTransition.tsx";
import { PersonaPicker } from "../ui/PersonaPicker.tsx";
import { missions } from "./missions.ts";

type Screen =
  | { kind: "paths" }
  | { kind: "lesson"; persona: Persona; index: number }
  /** Between lessons and after the last one: what Pipo did, and the path so far. */
  | { kind: "complete"; persona: Persona; index: number; log: RunLog };

/**
 * Paths, then that path's lessons in order, with a lesson complete screen after each one.
 * Screens change behind a dark full-page sweep: forward left to right, back right to left.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "paths" });
  // Best stars per lesson, for this visit.
  const [stars, setStars] = useState<Record<string, number>>({});
  const { direction, go } = usePageTransition();

  const forward = (next: Screen) => void go("to-right", () => setScreen(next));
  const back = () => void go("to-left", () => setScreen({ kind: "paths" }));

  // Lessons come sorted by path and order (see missionLoader).
  const lessonsOf = (persona: Persona) => missions.filter((m) => m.persona === persona);

  const finish = (persona: Persona, index: number, log: RunLog) => {
    setStars((s) => ({ ...s, [log.missionId]: Math.max(s[log.missionId] ?? 0, log.score.stars) }));
    forward({ kind: "complete", persona, index, log });
  };

  let content;
  if (screen.kind === "paths") {
    content = <PersonaPicker onStart={(persona) => forward({ kind: "lesson", persona, index: 0 })} />;
  } else {
    const lessons = lessonsOf(screen.persona);
    const mission = lessons[screen.index];
    if (!mission) {
      content = <PersonaPicker onStart={(persona) => forward({ kind: "lesson", persona, index: 0 })} />;
    } else if (screen.kind === "lesson") {
      const { persona, index } = screen;
      content = (
        <MissionPlayer
          key={mission.id}
          mission={mission}
          lesson={{ number: index + 1, total: lessons.length }}
          onFinish={(log) => finish(persona, index, log)}
          onBack={back}
        />
      );
    } else {
      const { persona, index, log } = screen;
      content = (
        <LessonComplete
          pathName={PERSONAS.find((p) => p.id === persona)?.name ?? ""}
          lessons={lessons}
          index={index}
          log={log}
          stars={stars}
          onContinue={() => forward({ kind: "lesson", persona, index: index + 1 })}
          onBack={back}
        />
      );
    }
  }

  return (
    <>
      <Backdrop />
      <div className="swup-transition-main">{content}</div>
      <TransitionOverlay direction={direction} />
    </>
  );
}
