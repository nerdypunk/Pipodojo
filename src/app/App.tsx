import { useEffect, useRef, useState } from "react";
import { postcardScene } from "../engine/postcard.ts";
import type { Persona, RunLog } from "../engine/types.ts";
import { pathById } from "../game/paths.ts";
import { DEFAULT_LOOK, describeLook, parseLook, type PipoLook } from "../game/pipoLook.ts";
import { currentDays, dayKey, parseStreak, playedOn, type Streak } from "../game/streak.ts";
import { Backdrop } from "../ui/Backdrop.tsx";
import { DesktopNote } from "../ui/DesktopNote.tsx";
import { LessonComplete } from "../ui/LessonComplete.tsx";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { TransitionOverlay, usePageTransition } from "../ui/PageTransition.tsx";
import { PathPicker } from "../ui/PathPicker.tsx";
import { PipoLookContext } from "../ui/Pipo.tsx";
import { PipoBuilder } from "../ui/PipoBuilder.tsx";
import { preloadTown, Town } from "../ui/town/Town.tsx";
import { missions } from "./missions.ts";
import { paintPostcard, type Postcard } from "./postcard.ts";

type Screen =
  /** Make your Pipo: first thing on arrival, and later from Pipo's garage in town. */
  | { kind: "build"; first: boolean }
  | { kind: "town" }
  | { kind: "paths"; persona: Persona }
  | { kind: "lesson"; persona: Persona; path: string; index: number };

const LOOK_KEY = "pipodojo.look";
const STREAK_KEY = "pipodojo.streak";

/** The day streak is kept on this device; storage may be missing, which just means no streak. */
function loadStreak(): Streak | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? parseStreak(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

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
  path: string;
  index: number;
  log: RunLog;
}

/**
 * Make your Pipo, then Pipodojo Town, then a persona's paths, then that path's lessons in order.
 * Screens change behind a dark full-page sweep: forward left to right, back right to left.
 * After a lesson the sweep stops halfway, covering the page, and the lesson complete box sits
 * on it; Continue sweeps it away into the next lesson.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "build", first: true });
  const [finished, setFinished] = useState<Finished | null>(null);
  // Best stars per lesson, for this visit.
  const [stars, setStars] = useState<Record<string, number>>({});
  const [look, setLook] = useState<PipoLook>(loadLook);
  // The latest run of each lesson this visit, and the postcard painted from them at the end of a path.
  const runs = useRef<Record<string, RunLog>>({});
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const painting = useRef(0);
  const [streak, setStreak] = useState<Streak | null>(loadStreak);
  const streakDays = currentDays(streak, dayKey(new Date()));
  const { direction, go, cover, uncover } = usePageTransition();

  // Fetch the 3D town while the player is still picking a look.
  useEffect(preloadTown, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(look));
    } catch {
      // Storage unavailable: the look just won't be remembered.
    }
  }, [look]);

  // Lessons come sorted by path and order (see missionLoader).
  const lessonsOf = (path: string) => missions.filter((m) => m.path === path);
  const toTown = () => void go("to-left", () => setScreen({ kind: "town" }));
  const toPaths = (persona: Persona) => void go("to-left", () => setScreen({ kind: "paths", persona }));

  const finish = async (persona: Persona, path: string, index: number, log: RunLog) => {
    // Finishing a lesson keeps the day streak going.
    setStreak((prev) => {
      const next = playedOn(prev, dayKey(new Date()));
      try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(next));
      } catch {
        // Not saved this time.
      }
      return next;
    });
    setStars((s) => ({ ...s, [log.missionId]: Math.max(s[log.missionId] ?? 0, log.score.stars) }));
    runs.current[log.missionId] = log;
    const lessons = lessonsOf(path);
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
    if (await cover("to-right")) setFinished({ persona, path, index, log });
  };

  const leaveBox = (next: Screen) => {
    setFinished(null);
    void uncover(() => setScreen(next));
  };

  let content;
  const lessons = screen.kind === "lesson" ? lessonsOf(screen.path) : [];
  const mission = screen.kind === "lesson" ? lessons[screen.index] : undefined;
  if (screen.kind === "lesson" && mission) {
    const { persona, path, index } = screen;
    content = (
      <MissionPlayer
        key={mission.id}
        mission={mission}
        lesson={{ number: index + 1, total: lessons.length }}
        onFinish={(log) => void finish(persona, path, index, log)}
        onBack={() => toPaths(persona)}
      />
    );
  } else if (screen.kind === "paths") {
    const { persona } = screen;
    content = (
      <PathPicker
        persona={persona}
        stars={stars}
        onStart={(path) => void go("to-right", () => setScreen({ kind: "lesson", persona, path, index: 0 }))}
        onBack={toTown}
      />
    );
  } else if (screen.kind === "town") {
    content = (
      <Town
        look={look}
        stars={stars}
        streak={streakDays}
        onVisit={(persona) => void go("to-right", () => setScreen({ kind: "paths", persona }))}
        onGarage={() => void go("to-right", () => setScreen({ kind: "build", first: false }))}
      />
    );
  } else {
    const first = screen.kind === "build" && screen.first;
    content = (
      <PipoBuilder
        look={look}
        onChange={setLook}
        first={first}
        onDone={() => void go(first ? "to-right" : "to-left", () => setScreen({ kind: "town" }))}
      />
    );
  }

  return (
    <PipoLookContext.Provider value={look}>
      <Backdrop />
      <div className="swup-transition-main">{content}</div>
      <TransitionOverlay direction={direction} />
      <DesktopNote />
      {finished && (
        <LessonComplete
          pathName={pathById(finished.path)?.name ?? ""}
          lessons={lessonsOf(finished.path)}
          index={finished.index}
          log={finished.log}
          stars={stars}
          postcard={postcard}
          brag={pathById(finished.path)?.brag ?? ""}
          streak={streakDays}
          onContinue={() => leaveBox({ kind: "lesson", persona: finished.persona, path: finished.path, index: finished.index + 1 })}
          onBack={() => leaveBox({ kind: "paths", persona: finished.persona })}
        />
      )}
    </PipoLookContext.Provider>
  );
}
