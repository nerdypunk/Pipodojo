import type { ButtonHTMLAttributes } from "react";
import StarBorder from "@/components/StarBorder";

type Tone = "primary" | "amber" | "plain";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone };

const BASE = "min-h-12 px-6! py-2! text-base font-extrabold!";

/** Star colors per tone: a light that laps the border, brighter on hover, with a pulse on press. */
const STAR = {
  primary: { backgroundColor: "#5a46e0", textColor: "#ffffff", borderColor: "#3b2d96", color: "#d3cfff" },
  amber: { backgroundColor: "#fbbf24", textColor: "#451a03", borderColor: "#d97706", color: "#ffffff" },
} as const;

/** The app's buttons. Primary and amber get the animated star border (React Bits StarBorder). */
export function Button({ tone = "primary", className = "", ...props }: Props) {
  if (tone === "plain") {
    return (
      <button
        type="button"
        className={`${BASE} rounded-2xl border-2 border-gray-300 bg-white text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 active:translate-y-px motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${className}`}
        {...props}
      />
    );
  }
  return (
    <StarBorder
      {...STAR[tone]}
      radius={16}
      thickness={2}
      stars={2}
      glow={0.8}
      sparkle
      className={`${BASE} ${className}`}
      {...props}
    />
  );
}
