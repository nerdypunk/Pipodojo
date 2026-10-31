import type { ButtonHTMLAttributes } from "react";

type Tone = "primary" | "amber" | "plain";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone };

const TONES: Record<Tone, string> = {
  primary: "bg-brand-600 text-white border-brand-800",
  amber: "bg-amber-400 text-amber-950 border-amber-600",
  plain: "bg-white text-gray-700 border-gray-300",
};

/** Chunky game button with a pressed-down effect. */
export function Button({ tone = "primary", className = "", ...props }: Props) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-2xl border-2 border-b-4 px-6 py-2 text-base font-extrabold transition active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}
