import StarBorder from "@/components/StarBorder";
import type { Mission } from "../engine/types.ts";

interface Props {
  mission: Mission;
  picks: string[];
  onTap: (pieceId: string) => void;
}

/** Numbered rows of prompt pieces to tap. */
export function BriefBuilder({ mission, picks, onTap }: Props) {
  return (
    <div className="space-y-3.5">
      {mission.slots.map((slot, i) => (
        <fieldset key={slot.id}>
          <legend className="mb-1.5 flex items-center gap-2 text-sm font-extrabold text-gray-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] text-white">
              {i + 1}
            </span>
            {slot.label}
            <span className="font-semibold text-gray-500">· {slot.pick === "one" ? "pick one" : "pick any"}</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {slot.pieces.map((piece) => {
              const on = picks.includes(piece.id);
              return (
                // Picked pieces keep a star lapping their border; the others show it on hover.
                <StarBorder
                  key={piece.id}
                  aria-pressed={on}
                  onClick={() => onTap(piece.id)}
                  theme="light"
                  radius={12}
                  thickness={on ? 2 : 1}
                  hover={on ? "lap" : "reveal"}
                  glow={on ? 0.9 : 0.5}
                  color="#6e5cf2"
                  backgroundColor={on ? "#e8e6ff" : "rgb(255 255 255 / 0.85)"}
                  textColor={on ? "#2d2470" : "#26233a"}
                  borderColor={on ? "#8c7dfb" : "#ffffff"}
                  className="min-h-11 justify-start px-3.5! py-1.5! text-left text-[15px] font-bold"
                >
                  {piece.label}
                </StarBorder>
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
      <p className="mb-1.5 text-sm font-extrabold text-gray-600">Your message to Pipo</p>
      <p
        className={`min-h-[3.25rem] rounded-2xl rounded-br-md px-4 py-2.5 leading-snug font-semibold ${
          prompt ? "bg-brand-600 text-white" : "border-2 border-dashed border-white/90 text-gray-500"
        }`}
      >
        {prompt || "Tap the pieces below to write it."}
      </p>
    </div>
  );
}
