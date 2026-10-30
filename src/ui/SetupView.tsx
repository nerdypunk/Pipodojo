import type { Mission } from "../engine/types.ts";
import { Button } from "./Button.tsx";

interface Props {
  mission: Mission;
  equipped: string[];
  goalId: string | null;
  onToggleTool: (id: string) => void;
  onChooseGoal: (id: string) => void;
  onGo: () => void;
}

export function SetupView({ mission, equipped, goalId, onToggleTool, onChooseGoal, onGo }: Props) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{mission.title}</h2>
        <p>{mission.scenario}</p>
        <ContextCard context={mission.context} />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">1. Equip Pipo's tools</legend>
        {mission.tools.map((tool) => {
          const locked = tool.role === "gated";
          return (
            <label key={tool.id} className="flex items-start gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={locked || equipped.includes(tool.id)}
                disabled={locked}
                onChange={() => onToggleTool(tool.id)}
              />
              <span>
                <span className="font-medium">{tool.label}</span>
                <span className="block text-sm text-gray-600">
                  {tool.description}
                  {locked && " Pipo always asks you first."}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">2. Aim Pipo: pick a goal</legend>
        {mission.goals.map((goal) => (
          <label key={goal.id} className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="radio"
              name="goal"
              className="mt-1 size-5"
              checked={goalId === goal.id}
              onChange={() => onChooseGoal(goal.id)}
            />
            <span>{goal.label}</span>
          </label>
        ))}
      </fieldset>

      <Button className="w-full" disabled={!goalId} onClick={onGo}>
        Pipo, go!
      </Button>
      {!goalId && <p className="text-center text-sm text-gray-600">Pick a goal to get started.</p>}
    </section>
  );
}

function ContextCard({ context }: { context: Record<string, unknown> }) {
  return (
    <>
      {Object.entries(context).map(([key, value]) => (
        <div key={key} className="rounded-lg bg-gray-100 p-3">
          <p className="text-sm font-semibold text-gray-600">{humanize(key)}</p>
          {value && typeof value === "object" ? (
            <dl>
              {Object.entries(value).map(([k, v]) => (
                <div key={k}>
                  <dt className="inline font-medium">{humanize(k)}: </dt>
                  <dd className="inline">{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>{String(value)}</p>
          )}
        </div>
      ))}
    </>
  );
}

export function humanize(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
