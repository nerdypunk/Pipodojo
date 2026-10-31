import type { Mission } from "../engine/types.ts";

interface Props {
  mission: Mission;
  picks: string[];
  locked: boolean;
  onTap: (pieceId: string) => void;
}

/** Rows of prompt pieces to tap. */
export function BriefBuilder({ mission, picks, locked, onTap }: Props) {
  return (
    <div className="space-y-3">
      {mission.slots.map((slot) => (
        <fieldset key={slot.id}>
          <legend className="mb-1.5 text-sm font-semibold text-gray-600">
            {slot.label} <span className="font-normal">· {slot.pick === "one" ? "pick one" : "pick any"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {slot.pieces.map((piece) => {
              const on = picks.includes(piece.id);
              return (
                <button
                  key={piece.id}
                  type="button"
                  aria-pressed={on}
                  disabled={locked}
                  onClick={() => onTap(piece.id)}
                  className={`min-h-11 rounded-2xl border-2 border-b-4 px-3 py-1.5 text-left font-medium transition active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    on ? "border-sky-400 bg-sky-50 text-sky-900" : "border-gray-300 bg-white text-gray-800"
                  }`}
                >
                  {piece.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function PromptCard({ prompt }: { prompt: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white px-4 py-3" aria-live="polite">
      <p className="text-xs font-semibold tracking-wide text-gray-500">Your prompt</p>
      <p className={`mt-1 ${prompt ? "text-gray-900" : "text-gray-400 italic"}`}>
        {prompt || "Tap the pieces below to build it."}
      </p>
    </div>
  );
}
