import { useEffect, useRef, useState } from "react";
import { postcardScene } from "../engine/postcard.ts";
import type { Persona, RunLog } from "../engine/types.ts";
import { PERSONAS } from "../game/personas.ts";
import { DEFAULT_LOOK, describeLook, parseLook, type PipoLook } from "../game/pipoLook.ts";
import { Backdrop } from "../ui/Backdrop.tsx";
import { LessonComplete } from "../ui/LessonComplete.tsx";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { TransitionOverlay, usePageTransition } from "../ui/PageTransition.tsx";
import { PersonaPicker } from "../ui/PersonaPicker.tsx";
import { PipoLookContext } from "../ui/Pipo.tsx";
import { PipoBuilder } from "../ui/PipoBuilder.tsx";
import { missions } from "./missions.ts";
import { paintPostcard, type Postcard } from "./postcard.ts";

type Screen =
  | { kind: "paths" }
  /** Make your Pipo, before a path starts. */
  | { kind: "build"; persona: Persona }
  | { kind: "lesson"; persona: Persona; index: number };

const LOOK_KEY = "pipodojo.look";

/** The look is a per-device convenience: storage may be missing or blocked, which is fine. */
function loadLook(): PipoLook {
  try {
    const raw = localStorage.getItem(LOOK_KEY);
    return raw ? parseLook(JSON.parse(raw)) : DEFAULT_LOOK;
  } catch {
    return DEFAULT_LOOK;
  }
}

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
  const [look, setLook] = useState<PipoLook>(loadLook);
  // The latest run of each lesson this visit, and the postcard painted from them at the end of a path.
  const runs = useRef<Record<string, RunLog>>({});
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const painting = useRef(0);
  const { direction, go, cover, uncover } = usePageTransition();

  useEffect(() => {
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(look));
    } catch {
      // Storage unavailable: the look just won't be remembered.
    }
  }, [look]);

  // Lessons come sorted by path and order (see missionLoader).
  const lessonsOf = (persona: Persona) => missions.filter((m) => m.persona === persona);
  const toPaths = () => void go("to-left", () => setScreen({ kind: "paths" }));

  const finish = async (persona: Persona, index: number, log: RunLog) => {
    setStars((s) => ({ ...s, [log.missionId]: Math.max(s[log.missionId] ?? 0, log.score.stars) }));
    runs.current[log.missionId] = log;
    const lessons = lessonsOf(persona);
    if (index === lessons.length - 1) {
      // Last lesson: Pipo starts painting now, while the box and the gift come up.
      const scene = postcardScene(
        describeLook(look),
        lessons.flatMap((mission) => (runs.current[mission.id] ? [{ mission, log: runs.current[mission.id]! }] : [])),
      );
      const ticket = ++painting.current;
      setPostcard({ status: "painting" });
      void paintPostcard(scene).then((ready) => {
        if (ticket === painting.current) setPostcard(ready);
      });
    }
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
  } else if (screen.kind === "build") {
    const { persona } = screen;
    content = (
      <PipoBuilder
        pathName={PERSONAS.find((p) => p.id === persona)?.name ?? ""}
        look={look}
        onChange={setLook}
        onStart={() => void go("to-right", () => setScreen({ kind: "lesson", persona, index: 0 }))}
        onBack={toPaths}
      />
    );
  } else {
    content = <PersonaPicker onStart={(persona) => void go("to-right", () => setScreen({ kind: "build", persona }))} />;
  }

  return (
    <PipoLookContext.Provider value={look}>
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
          postcard={postcard}
          onContinue={() => leaveBox({ kind: "lesson", persona: finished.persona, index: finished.index + 1 })}
          onBack={() => leaveBox({ kind: "paths" })}
        />
      )}
    </PipoLookContext.Provider>
  );
}
