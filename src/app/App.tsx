import { MissionPlayer } from "../ui/MissionPlayer.tsx";
import { missions } from "./missions.ts";

export function App() {
  const mission = missions[0];
  return (
    <main className="mx-auto max-w-md p-4 md:max-w-5xl md:px-6">
      <h1 className="mb-3 text-xl font-bold text-green-600">Pipodojo</h1>
      {mission ? <MissionPlayer key={mission.id} mission={mission} /> : <p>No missions yet.</p>}
    </main>
  );
}
