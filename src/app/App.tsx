import { useState } from "react";
import type { Persona } from "../engine/types.ts";
import { Backdrop } from "../ui/Backdrop.tsx";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { TransitionOverlay, usePageTransition } from "../ui/PageTransition.tsx";
import { PersonaPicker } from "../ui/PersonaPicker.tsx";
import { missions } from "./missions.ts";

/**
 * Screens change behind a dark full-page sweep (swup overlay + slide themes): forward sweeps
 * left to right, back sweeps right to left. The background stays put.
 */
export function App() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const { direction, go } = usePageTransition();

  const open = (next: Persona) => void go("to-right", () => setPersona(next));
  const back = () => void go("to-left", () => setPersona(null));

  // For now each path opens its first lesson.
  const mission = persona ? missions.find((m) => m.persona === persona) : undefined;

  return (
    <>
      <Backdrop />
      <div className="swup-transition-main">
        {mission ? (
          <MissionPlayer key={mission.id} mission={mission} onBack={back} />
        ) : (
          <PersonaPicker onStart={open} />
        )}
      </div>
      <TransitionOverlay direction={direction} />
    </>
  );
}
