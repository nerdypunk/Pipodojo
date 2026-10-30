import { buildPrompt } from "../engine/brief.ts";
import type { Mission } from "../engine/types.ts";

interface Props {
  mission: Mission;
  picks: string[];
  onTap: (optionId: string) => void;
}

/** Build the prompt by tapping options. The "Your prompt" card shows the words they add up to. */
export function BriefBuilder({ mission, picks, onTap }: Props) {
  return (
    <div className="space-y-4">
      {mission.brief.map((slot) => (
        <fieldset key={slot.id} className="space-y-2">
          <legend className="font-medium">
            {slot.label} <span className="text-sm font-normal text-gray-600">({slot.pick === "one" ? "pick one" : "pick any"})</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {slot.options.map((option) => {
              const on = picks.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onTap(option.id)}
                  className={`min-h-11 rounded-full border-2 px-4 py-2 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    on ? "border-orange-500 bg-orange-50 font-medium" : "border-gray-300 bg-white"
                  }`}
                >
                  {on && <span aria-hidden="true">✓ </span>}
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <PromptCard prompt={buildPrompt(mission, picks)} />
    </div>
  );
}

export function PromptCard({ prompt }: { prompt: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-400 bg-gray-50 p-3" aria-live="polite">
      <p className="text-sm font-semibold text-gray-600">Your prompt</p>
      <p className={prompt ? "" : "text-gray-500 italic"}>{prompt || "Tap options above to build your prompt."}</p>
    </div>
  );
}
