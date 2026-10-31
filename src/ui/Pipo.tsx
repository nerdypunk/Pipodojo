// Pipo, drawn in code: a small hovering robot with a glossy orange shell, a dark glass visor
// with LED eyes that change with its mood, and a glowing core. (Placeholder until final art.)
import { useId } from "react";

export type Mood = "idle" | "thinking" | "happy" | "oops";

const LED = "#a5f3fc";

/** Sized by className so it can scale with its container. */
export function Pipo({ mood = "idle", className = "h-14 w-14" }: { mood?: Mood; className?: string }) {
  const id = useId().replace(/:/g, "");
  const shell = `pipo-shell-${id}`;
  const visor = `pipo-visor-${id}`;
  const glow = `pipo-glow-${id}`;
  const core = `pipo-core-${id}`;

  return (
    <svg className={className} viewBox="0 0 120 132" role="img" aria-label="Pipo">
      <defs>
        <linearGradient id={shell} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="0.55" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#d9530a" />
        </linearGradient>
        <linearGradient id={visor} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b2d96" />
          <stop offset="1" stopColor="#120e2b" />
        </linearGradient>
        <radialGradient id={core}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#9cc2ff" />
          <stop offset="1" stopColor="#6e5cf2" stopOpacity="0" />
        </radialGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hover shadow: shrinks as Pipo floats up. */}
      <ellipse className="pipo-shadow" cx="60" cy="126" rx="24" ry="4" fill="#2d2470" opacity="0.3" />

      <g className="pipo-float">
        {/* Antenna with a light that pulses while thinking */}
        <line x1="60" y1="21" x2="60" y2="9" stroke="#3b2d96" strokeWidth="3" strokeLinecap="round" />
        <circle
          cx="60"
          cy="7"
          r="5"
          fill={mood === "thinking" ? "#ffd23f" : "#b2a9ff"}
          filter={`url(#${glow})`}
          className={mood === "thinking" ? "animate-pulse motion-reduce:animate-none" : ""}
        />

        {/* Ear pods */}
        <circle cx="16" cy="50" r="8" fill="#3b2d96" />
        <circle cx="16" cy="50" r="4" fill="none" stroke="#b2a9ff" strokeWidth="2" />
        <circle cx="104" cy="50" r="8" fill="#3b2d96" />
        <circle cx="104" cy="50" r="4" fill="none" stroke="#b2a9ff" strokeWidth="2" />

        {/* Head */}
        <rect x="18" y="20" width="84" height="62" rx="28" fill={`url(#${shell})`} />
        <path d="M32 27 Q60 18 88 27" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Visor */}
        <rect x="27" y="33" width="66" height="36" rx="18" fill={`url(#${visor})`} />
        <path d="M35 39 L47 39 L41 52 L31 52 Z" fill="#fff" opacity="0.08" />
        <g filter={`url(#${glow})`} stroke={LED} fill={LED} strokeLinecap="round">
          <Eyes mood={mood} />
        </g>

        {/* Floating body with a glowing core */}
        <rect x="38" y="88" width="44" height="26" rx="13" fill={`url(#${shell})`} />
        <rect x="24" y="92" width="10" height="16" rx="5" fill="#3b2d96" />
        <rect x="86" y="92" width="10" height="16" rx="5" fill="#3b2d96" />
        <circle cx="60" cy="101" r="9" fill={`url(#${core})`} className="pipo-core" />
      </g>
    </svg>
  );
}

function Eyes({ mood }: { mood: Mood }) {
  switch (mood) {
    case "happy":
      return (
        <>
          <path d="M40 54 Q46 45 52 54" fill="none" strokeWidth="4" />
          <path d="M68 54 Q74 45 80 54" fill="none" strokeWidth="4" />
          <path d="M55 61 Q60 64 65 61" fill="none" strokeWidth="2.5" opacity="0.8" />
        </>
      );
    case "oops":
      return (
        <>
          <path d="M40 48 Q46 56 52 48" fill="none" strokeWidth="4" />
          <path d="M68 48 Q74 56 80 48" fill="none" strokeWidth="4" />
          <circle cx="60" cy="61" r="2.2" stroke="none" opacity="0.8" />
        </>
      );
    case "thinking":
      return (
        <>
          <rect x="47" y="41" width="8" height="10" rx="4" stroke="none" />
          <rect x="71" y="41" width="8" height="10" rx="4" stroke="none" />
          <path d="M55 61 L65 61" fill="none" strokeWidth="2.5" opacity="0.6" />
        </>
      );
    default:
      return (
        <>
          <rect x="42" y="44" width="9" height="15" rx="4.5" stroke="none" />
          <rect x="69" y="44" width="9" height="15" rx="4.5" stroke="none" />
        </>
      );
  }
}
