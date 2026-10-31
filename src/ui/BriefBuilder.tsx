import type { Mission } from "../engine/types.ts";

interface Props {
  mission: Mission;
  picks: string[];
  locked: boolean;
  onTap: (pieceId: string) => void;
}

/** Numbered rows of prompt pieces to tap. */
export function BriefBuilder({ mission, picks, locked, onTap }: Props) {
  return (
    <div className="space-y-5">
      {mission.slots.map((slot, i) => (
        <fieldset key={slot.id}>
          <legend className="mb-2 flex items-center gap-2 text-sm font-extrabold tracking-wider text-gray-500 uppercase">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
              {i + 1}
            </span>
            {slot.label}
            <span className="font-bold tracking-normal text-gray-400 normal-case">
              · {slot.pick === "one" ? "pick one" : "pick any"}
            </span>
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
                  className={`min-h-12 rounded-2xl border-2 border-b-4 px-4 py-2 text-left font-bold transition active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none disabled:cursor-default focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    on ? "border-sky-400 bg-sky-100 text-sky-900" : "border-gray-200 bg-white text-ink hover:bg-gray-50"
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

/** The prompt as a message bubble, the way it would look sent to an assistant. */
export function PromptCard({ prompt }: { prompt: string }) {
  return (
    <div aria-live="polite">
      <p className="mb-2 text-sm font-extrabold tracking-wider text-gray-400 uppercase">Your message to Pipo</p>
      <p
        className={`min-h-[4.5rem] rounded-3xl rounded-br-md px-5 py-3 text-lg leading-snug font-semibold ${
          prompt ? "bg-sky-500 text-white" : "border-2 border-dashed border-gray-300 text-gray-400"
        }`}
      >
        {prompt || "Tap the pieces below to write it."}
      </p>
    </div>
  );
}
