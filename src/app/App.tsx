import { useState } from "react";
import type { Persona } from "../engine/types.ts";
import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { PersonaPicker } from "../ui/PersonaPicker.tsx";
import { missions } from "./missions.ts";

export function App() {
  const [persona, setPersona] = useState<Persona | null>(null);

  if (!persona) return <PersonaPicker onStart={setPersona} />;

  // For now each path opens its first lesson.
  const mission = missions.find((m) => m.persona === persona);
  return mission ? (
    <MissionPlayer key={mission.id} mission={mission} onBack={() => setPersona(null)} />
  ) : (
    <PersonaPicker onStart={setPersona} />
  );
}
