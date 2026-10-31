import { useState } from "react";
import type { Persona } from "../engine/types.ts";
import { Backdrop } from "../ui/Backdrop.tsx";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { TransitionOverlay, usePageTransition } from "../ui/PageTransition.tsx";
import { PersonaPicker } from "../ui/PersonaPicker.tsx";
import { missions } from "./missions.ts";

/**
 * Paths, then that path's lessons in order. Screens change behind a dark full-page sweep
 * (swup overlay + slide themes): forward sweeps left to right, back sweeps right to left.
 */
export function App() {
  const [place, setPlace] = useState<{ persona: Persona; index: number } | null>(null);
  const { direction, go } = usePageTransition();

  const open = (persona: Persona) => void go("to-right", () => setPlace({ persona, index: 0 }));
  const back = () => void go("to-left", () => setPlace(null));

  // Lessons come sorted by path and order (see missionLoader).
  const lessons = place ? missions.filter((m) => m.persona === place.persona) : [];
  const mission = place ? lessons[place.index] : undefined;

  const next = () =>
    place && place.index + 1 < lessons.length
      ? void go("to-right", () => setPlace({ ...place, index: place.index + 1 }))
      : back();

  return (
    <>
      <Backdrop />
      <div className="swup-transition-main">
        {place && mission ? (
          <MissionPlayer
            key={mission.id}
            mission={mission}
            lesson={{ number: place.index + 1, total: lessons.length }}
            next={{ label: place.index + 1 < lessons.length ? "Next lesson" : "Finish", onGo: next }}
            onBack={back}
          />
        ) : (
          <PersonaPicker onStart={open} />
        )}
      </div>
      <TransitionOverlay direction={direction} />
    </>
  );
}
