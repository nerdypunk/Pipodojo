import { useState } from "react";
import type { Persona, RunLog } from "../engine/types.ts";
import { PERSONAS } from "../game/personas.ts";
import { Backdrop } from "../ui/Backdrop.tsx";
import { LessonComplete } from "../ui/LessonComplete.tsx";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { TransitionOverlay, usePageTransition } from "../ui/PageTransition.tsx";
import { PersonaPicker } from "../ui/PersonaPicker.tsx";
import { missions } from "./missions.ts";

type Screen = { kind: "paths" } | { kind: "lesson"; persona: Persona; index: number };

/** The lesson just finished, shown in a box on the dark sweep panel until the player moves on. */
interface Finished {
  persona: Persona;
  index: number;
  log: RunLog;
}

/**
 * Paths, then that path's lessons in order. Screens change behind a dark full-page sweep:
 * forward left to right, back right to left. After a lesson the sweep stops halfway, covering
 * the page, and the lesson complete box sits on it; Continue sweeps it away into the next lesson.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "paths" });
  const [finished, setFinished] = useState<Finished | null>(null);
  // Best stars per lesson, for this visit.
  const [stars, setStars] = useState<Record<string, number>>({});
  const { direction, go, cover, uncover } = usePageTransition();

  // Lessons come sorted by path and order (see missionLoader).
  const lessonsOf = (persona: Persona) => missions.filter((m) => m.persona === persona);
  const toPaths = () => void go("to-left", () => setScreen({ kind: "paths" }));

  const finish = async (persona: Persona, index: number, log: RunLog) => {
    setStars((s) => ({ ...s, [log.missionId]: Math.max(s[log.missionId] ?? 0, log.score.stars) }));
    if (await cover("to-right")) setFinished({ persona, index, log });
  };

  const leaveBox = (next: Screen) => {
    setFinished(null);
    void uncover(() => setScreen(next));
  };

  let content;
  const lessons = screen.kind === "lesson" ? lessonsOf(screen.persona) : [];
  const mission = screen.kind === "lesson" ? lessons[screen.index] : undefined;
  if (screen.kind === "lesson" && mission) {
    const { persona, index } = screen;
    content = (
      <MissionPlayer
        key={mission.id}
        mission={mission}
        lesson={{ number: index + 1, total: lessons.length }}
        onFinish={(log) => void finish(persona, index, log)}
        onBack={toPaths}
      />
    );
  } else {
    content = <PersonaPicker onStart={(persona) => void go("to-right", () => setScreen({ kind: "lesson", persona, index: 0 }))} />;
  }

  return (
    <>
      <Backdrop />
      <div className="swup-transition-main">{content}</div>
      <TransitionOverlay direction={direction} />
      {finished && (
        <LessonComplete
          pathName={PERSONAS.find((p) => p.id === finished.persona)?.name ?? ""}
          lessons={lessonsOf(finished.persona)}
          index={finished.index}
          log={finished.log}
          stars={stars}
          onContinue={() => leaveBox({ kind: "lesson", persona: finished.persona, index: finished.index + 1 })}
          onBack={() => leaveBox({ kind: "paths" })}
        />
      )}
    </>
  );
}
