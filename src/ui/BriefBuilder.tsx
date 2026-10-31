import StarBorder from "@/components/StarBorder";
import type { Mission } from "../engine/types.ts";
import { PieceGlow, type GlowMode } from "./PieceGlow.tsx";

interface Props {
  mission: Mission;
  picks: string[];
  /** What Pipo is doing; picked pieces' glowing borders follow it. */
  mode: GlowMode;
  onTap: (pieceId: string) => void;
}

/** Numbered rows of prompt pieces to tap. */
export function BriefBuilder({ mission, picks, mode, onTap }: Props) {
  return (
    <div className="space-y-3 md:space-y-4">
      {mission.slots.map((slot, i) => (
        <fieldset key={slot.id}>
          <legend className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink md:mb-2 md:text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
              {i + 1}
            </span>
            {slot.label}
            <PickBadge pick={slot.pick} />
          </legend>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {slot.pieces.map((piece) => {
              const on = picks.includes(piece.id);
              return (
                // Picked pieces get the glowing shader border; every piece shows a star on hover.
                <StarBorder
                  key={piece.id}
                  aria-pressed={on}
                  onClick={() => onTap(piece.id)}
                  theme="light"
                  radius={14}
                  thickness={1}
                  hover="reveal"
                  glow={0.5}
                  color="#6e5cf2"
                  backgroundColor={on ? "#ece9ff" : "rgb(255 255 255 / 0.88)"}
                  textColor={on ? "#2d2470" : "#26233a"}
                  borderColor={on ? "#b2a9ff" : "#ffffff"}
                  className="min-h-11 justify-start px-3! py-1.5! text-left text-[15px] font-bold! md:min-h-12 md:px-4! md:py-2! md:text-[17px]"
                >
                  {on && <PieceGlow mode={mode} />}
                  <span className="relative">{piece.label}</span>
                </StarBorder>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/** "Pick one" / "Pick any" in its own little badge, so the rule is easy to spot. */
function PickBadge({ pick }: { pick: "one" | "many" }) {
  return pick === "one" ? (
    <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-white">
      Pick one
    </span>
  ) : (
    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-brand-700 ring-2 ring-brand-300">
      Pick any
    </span>
  );
}

/** The prompt as a message bubble, the way it would look sent to an assistant. */
export function PromptCard({ prompt }: { prompt: string }) {
  return (
    <div aria-live="polite">
      <p className="mb-1.5 text-sm font-extrabold text-ink md:mb-2 md:text-base">Your message to Pipo</p>
      <p
        className={`min-h-12 rounded-2xl rounded-br-md px-4 py-2.5 text-base leading-snug font-semibold md:min-h-[3.5rem] md:py-3 md:text-[17px] ${
          prompt ? "bg-brand-600 text-white" : "border-2 border-dashed border-white/90 text-gray-500"
        }`}
      >
        {prompt || "Tap the pieces below to write it."}
      </p>
    </div>
  );
}
