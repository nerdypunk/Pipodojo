import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "plain" };

export function Button({ variant = "primary", className = "", ...props }: Props) {
  const look =
    variant === "primary"
      ? "bg-orange-500 text-white border-orange-600"
      : "bg-white text-gray-900 border-gray-300";
  return (
    <button
      type="button"
      className={`min-h-11 rounded-lg border-2 px-4 py-2 font-semibold disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${look} ${className}`}
      {...props}
    />
  );
}
