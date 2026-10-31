// Pipo, drawn in code: a small hovering robot with a glossy shell, a dark glass visor with LED
// eyes that change with its mood, and a glowing core. The head, body and colours follow the
// player's look (PipoLookContext), or can be passed in directly (the look builder's previews).
import { createContext, useContext, useId } from "react";
import { DEFAULT_LOOK, paletteOf, type PipoLook } from "../game/pipoLook.ts";

export type Mood = "idle" | "thinking" | "happy" | "oops";

/** The player's chosen look; every Pipo on screen uses it. */
export const PipoLookContext = createContext<PipoLook>(DEFAULT_LOOK);

const LED = "#a5f3fc";

interface Props {
  mood?: Mood;
  /** Sized by className so it can scale with its container. */
  className?: string;
  /** Overrides the context look (for previews). */
  look?: PipoLook;
}

export function Pipo({ mood = "idle", className = "h-14 w-14", look }: Props) {
  const fromContext = useContext(PipoLookContext);
  const { head, body, color } = look ?? fromContext;
  const palette = paletteOf(color);
  const id = useId().replace(/:/g, "");
  const shell = `pipo-shell-${id}`;
  const visor = `pipo-visor-${id}`;
  const glow = `pipo-glow-${id}`;
  const core = `pipo-core-${id}`;
  const shellFill = `url(#${shell})`;

  return (
    <svg className={className} viewBox="0 0 120 132" role="img" aria-label="Pipo">
      <defs>
        <linearGradient id={shell} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.shell[0]} />
          <stop offset="0.55" stopColor={palette.shell[1]} />
          <stop offset="1" stopColor={palette.shell[2]} />
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
      <ellipse className="pipo-shadow" cx="60" cy="127" rx="24" ry="4" fill="#2d2470" opacity="0.3" />

      <g className="pipo-float">
        {/* Antenna with a light that pulses while thinking */}
        <line x1="60" y1="21" x2="60" y2="9" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />
        <circle
          cx="60"
          cy="7"
          r="5"
          fill={mood === "thinking" ? "#ffd23f" : "#b2a9ff"}
          filter={`url(#${glow})`}
          className={mood === "thinking" ? "animate-pulse motion-reduce:animate-none" : ""}
        />

        <Body kind={body} shellFill={shellFill} accent={palette.accent} core={`url(#${core})`} />
        <Head kind={head} shellFill={shellFill} accent={palette.accent} />

        {/* Visor */}
        <rect x="27" y="33" width="66" height="36" rx="18" fill={`url(#${visor})`} />
        <path d="M35 39 L47 39 L41 52 L31 52 Z" fill="#fff" opacity="0.08" />
        <g filter={`url(#${glow})`} stroke={LED} fill={LED} strokeLinecap="round">
          <Eyes mood={mood} />
        </g>
      </g>
    </svg>
  );
}

function Head({ kind, shellFill, accent }: { kind: PipoLook["head"]; shellFill: string; accent: string }) {
  if (kind === "dome") {
    return (
      <>
        {/* Side fins */}
        <path d="M14 46 L6 40 L8 58 Z" fill={accent} />
        <path d="M106 46 L114 40 L112 58 Z" fill={accent} />
        <ellipse cx="60" cy="51" rx="46" ry="36" fill={shellFill} />
        {/* Glass dome shine */}
        <path d="M26 36 Q36 18 60 16" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (kind === "boxy") {
    return (
      <>
        <rect x="8" y="42" width="10" height="18" rx="3" fill={accent} />
        <rect x="102" y="42" width="10" height="18" rx="3" fill={accent} />
        <rect x="16" y="20" width="88" height="62" rx="10" fill={shellFill} />
        {[
          [23, 27],
          [97, 27],
          [23, 75],
          [97, 75],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" fill="#fff" opacity="0.6" />
        ))}
        <path d="M28 24 L92 24" stroke="#fff" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      {/* Ear pods */}
      <circle cx="16" cy="50" r="8" fill={accent} />
      <circle cx="16" cy="50" r="4" fill="none" stroke="#b2a9ff" strokeWidth="2" />
      <circle cx="104" cy="50" r="8" fill={accent} />
      <circle cx="104" cy="50" r="4" fill="none" stroke="#b2a9ff" strokeWidth="2" />
      <rect x="18" y="20" width="84" height="62" rx="28" fill={shellFill} />
      <path d="M32 27 Q60 18 88 27" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  );
}

function Body({
  kind,
  shellFill,
  accent,
  core,
}: {
  kind: PipoLook["body"];
  shellFill: string;
  accent: string;
  core: string;
}) {
  if (kind === "wheels") {
    return (
      <>
        <rect x="24" y="90" width="10" height="14" rx="5" fill={accent} />
        <rect x="86" y="90" width="10" height="14" rx="5" fill={accent} />
        <rect x="36" y="86" width="48" height="24" rx="8" fill={shellFill} />
        <circle cx="60" cy="98" r="7" fill={core} className="pipo-core" />
        <circle cx="60" cy="117" r="9" fill="#26233a" />
        <circle cx="60" cy="117" r="3.5" fill="#cbc9da" />
      </>
    );
  }
  if (kind === "rocket") {
    return (
      <>
        <path className="pipo-flame" d="M52 110 Q60 130 68 110 Z" fill="#fbbf24" />
        <path className="pipo-flame" d="M55 110 Q60 122 65 110 Z" fill="#ff7a1a" />
        <path d="M30 96 L40 92 L40 106 Z" fill={accent} />
        <path d="M90 96 L80 92 L80 106 Z" fill={accent} />
        <rect x="40" y="86" width="40" height="26" rx="13" fill={shellFill} />
        <circle cx="60" cy="99" r="8" fill={core} className="pipo-core" />
      </>
    );
  }
  return (
    <>
      <rect x="24" y="92" width="10" height="16" rx="5" fill={accent} />
      <rect x="86" y="92" width="10" height="16" rx="5" fill={accent} />
      <rect x="38" y="88" width="44" height="26" rx="13" fill={shellFill} />
      <circle cx="60" cy="101" r="9" fill={core} className="pipo-core" />
    </>
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
