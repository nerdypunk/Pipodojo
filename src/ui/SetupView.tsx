import { isBriefReady } from "../engine/brief.ts";
import type { Mission } from "../engine/types.ts";
import { BriefBuilder } from "./BriefBuilder.tsx";
import { Button } from "./Button.tsx";

interface Props {
  mission: Mission;
  equipped: string[];
  picks: string[];
  onToggleTool: (id: string) => void;
  onTapOption: (id: string) => void;
  onGo: () => void;
}

export function SetupView({ mission, equipped, picks, onToggleTool, onTapOption, onGo }: Props) {
  const ready = isBriefReady(mission, picks);
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

      <section className="space-y-2">
        <h3 className="font-semibold">2. Brief Pipo: build your prompt</h3>
        <BriefBuilder mission={mission} picks={picks} onTap={onTapOption} />
      </section>

      <Button className="w-full" disabled={!ready} onClick={onGo}>
        Pipo, go!
      </Button>
      {!ready && (
        <p className="text-center text-sm text-gray-600">
          Pick {missingChoices(mission, picks).join(" and ")} to get started.
        </p>
      )}
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

/** "a goal", "a tone": the pick-one slots still waiting for a choice. */
function missingChoices(mission: Mission, picks: string[]): string[] {
  return mission.brief
    .filter((slot) => slot.pick === "one" && !slot.options.some((o) => picks.includes(o.id)))
    .map((slot) => `a ${slot.label.toLowerCase()}`);
}

export function humanize(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
