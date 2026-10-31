import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { missions } from "./missions.ts";

export function App() {
  const mission = missions[0];
  return mission ? (
    <MissionPlayer key={mission.id} mission={mission} />
  ) : (
    <p className="p-8 text-center font-bold">No lessons yet.</p>
  );
}
