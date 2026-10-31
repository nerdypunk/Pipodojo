import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "plain" };

/** Chunky button with a pressed-down effect. */
export function Button({ variant = "primary", className = "", ...props }: Props) {
  const look =
    variant === "primary"
      ? "bg-green-500 text-white border-green-700"
      : "bg-white text-gray-800 border-gray-300";
  return (
    <button
      type="button"
      className={`min-h-12 rounded-2xl border-2 border-b-4 px-4 py-2 font-bold tracking-wide transition active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${look} ${className}`}
      {...props}
    />
  );
}
