import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { missions } from "./missions.ts";

export function App() {
  const mission = missions[0];
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">Pipodojo</h1>
      {mission ? <MissionPlayer key={mission.id} mission={mission} /> : <p>No missions yet.</p>}
    </main>
  );
}
