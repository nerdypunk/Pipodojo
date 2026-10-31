// Placeholder Pipo drawn in code (SPEC: fallback until the Muse Image art is ready).
export type Mood = "idle" | "thinking" | "happy" | "oops";

/** Sized by className so it can scale with its column. */
export function Pipo({ mood = "idle", className = "h-14 w-14" }: { mood?: Mood; className?: string }) {
  const mouth =
    mood === "happy" ? "M24 35 Q30 40 36 35" : mood === "oops" ? "M25 37 Q30 33 35 37" : "M26 36 Q30 38 34 36";
  return (
    <svg className={className} viewBox="0 0 60 60" role="img" aria-label="Pipo">
      <line x1="30" y1="4" x2="30" y2="13" stroke="#3b2f2f" strokeWidth="2.5" strokeLinecap="round" />
      <circle
        cx="30"
        cy="5"
        r="4"
        fill="#ffd23f"
        className={mood === "thinking" ? "animate-pulse motion-reduce:animate-none" : ""}
      />
      <rect x="10" y="13" width="40" height="42" rx="20" fill="#ff8c42" stroke="#3b2f2f" strokeWidth="2.5" />
      <rect x="16" y="21" width="28" height="22" rx="8" fill="#2a2a3a" />
      <circle cx="24" cy="30" r="3" fill="#fff" />
      <circle cx="36" cy="30" r="3" fill="#fff" />
      <path d={mouth} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
