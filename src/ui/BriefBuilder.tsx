import StarBorder from "@/components/StarBorder";
import type { Mission } from "../engine/types.ts";
import { TOUCH } from "./device.ts";
import { play } from "../app/sound.ts";
import { useLang } from "../i18n/index.tsx";

interface Props {
  mission: Mission;
  picks: string[];
  onTap: (pieceId: string) => void;
  /** After Check: show only the pieces that went into the prompt. */
  onlyPicked?: boolean;
}

/** A tiny tap you can feel on phones that support it. */
function buzz() {
  navigator.vibrate?.(12);
}

/** Numbered rows of prompt pieces to tap. */
export function BriefBuilder({ mission, picks, onTap, onlyPicked = false }: Props) {
  const { t } = useLang();
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
            {onlyPicked && !slot.pieces.some((p) => picks.includes(p.id)) && (
              <span className="text-sm font-semibold text-gray-500 italic">{t.lesson.nothingPicked}</span>
            )}
            {slot.pieces.filter((piece) => !onlyPicked || picks.includes(piece.id)).map((piece) => {
              const on = picks.includes(piece.id);
              const tap = () => {
                buzz();
                play(on ? "unpick" : "pick");
                onTap(piece.id);
              };
              if (TOUCH) {
                // Phones: the same look without a canvas per piece (see device.ts).
                return (
                  <button
                    key={piece.id}
                    type="button"
                    aria-pressed={on}
                    onClick={tap}
                    className={`inline-flex min-h-11 items-center justify-start gap-2 rounded-[14px] px-3 py-1.5 text-left text-[15px] leading-tight font-bold shadow-sm transition-transform active:scale-[0.97] motion-reduce:transition-none ${
                      on
                        ? "pick-pop bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgb(59_45_150/0.6)] ring-2 ring-brand-800 ring-inset"
                        : "bg-white/90 text-ink ring-1 ring-white ring-inset"
                    }`}
                  >
                    {on && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-brand-700"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    )}
                    {piece.label}
                  </button>
                );
              }
              return (
                // Picked pieces turn solid violet with a check and pop; every piece shows a star on hover.
                <StarBorder
                  key={piece.id}
                  aria-pressed={on}
                  onClick={tap}
                  theme={on ? "dark" : "light"}
                  radius={14}
                  thickness={on ? 2 : 1}
                  hover="reveal"
                  glow={0.6}
                  color={on ? "#d3cfff" : "#6e5cf2"}
                  backgroundColor={on ? "#5a46e0" : "rgb(255 255 255 / 0.88)"}
                  textColor={on ? "#ffffff" : "#26233a"}
                  borderColor={on ? "#3b2d96" : "#ffffff"}
                  className={`min-h-11 justify-start gap-2! px-3! py-1.5! text-left text-[15px] font-bold! shadow-sm md:min-h-12 md:px-4! md:py-2! md:text-[17px] ${
                    on ? "pick-pop shadow-[0_6px_16px_-6px_rgb(59_45_150/0.6)]" : ""
                  }`}
                >
                  {on && (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-brand-700"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
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
  const { t } = useLang();
  return pick === "one" ? (
    <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-white">
      {t.lesson.pickOne}
    </span>
  ) : (
    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-brand-700 ring-2 ring-brand-300">
      {t.lesson.pickAny}
    </span>
  );
}

/** The prompt as a message bubble, the way it would look sent to an assistant. */
export function PromptCard({ prompt }: { prompt: string }) {
  const { t } = useLang();
  return (
    <div aria-live="polite">
      <p className="mb-1.5 text-sm font-extrabold text-ink md:mb-2 md:text-base">{t.lesson.yourMessage}</p>
      <p
        className={`min-h-12 rounded-2xl rounded-br-md px-4 py-2.5 text-base leading-snug font-semibold md:min-h-[3.5rem] md:py-3 md:text-[17px] ${
          prompt ? "bg-brand-600 text-white" : "border-2 border-dashed border-white/90 text-gray-500"
        }`}
      >
        {prompt || t.lesson.tapPieces}
      </p>
    </div>
  );
}
