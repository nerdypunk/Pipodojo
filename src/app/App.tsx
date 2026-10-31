import { useState } from "react";
import type { Persona } from "../engine/types.ts";
import { Backdrop } from "../ui/Backdrop.tsx";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { PersonaPicker } from "../ui/PersonaPicker.tsx";
import { missions } from "./missions.ts";

/**
 * Screen changes use transition-style (clip-path reveals): opening a lesson grows it from the
 * middle like a portal, going back wipes the paths in from the left. The background stays put.
 */
type Reveal = "in:circle:center" | "in:wipe:right" | undefined;

export function App() {
  const [persona, setPersona] = useState<Persona | null>(null);
  // No reveal on first load; set on every screen change after that.
  const [reveal, setReveal] = useState<Reveal>(undefined);

  const open = (next: Persona) => {
    setReveal("in:circle:center");
    setPersona(next);
  };
  const back = () => {
    setReveal("in:wipe:right");
    setPersona(null);
  };

  // For now each path opens its first lesson.
  const mission = persona ? missions.find((m) => m.persona === persona) : undefined;
  const screenKey = mission?.id ?? "paths";

  return (
    <>
      <Backdrop />
      <div key={screenKey} transition-style={reveal} className="page-transition">
        {mission ? (
          <MissionPlayer key={mission.id} mission={mission} onBack={back} />
        ) : (
          <PersonaPicker onStart={open} />
        )}
      </div>
    </>
  );
}
