// A soft animated glow (Paper PulsingBorder) that sits BEHIND a card and peeks out around
// its edges. It follows what Pipo is doing: a quiet drift while you build, a little brighter
// and quicker while Pipo thinks, calm once the answer is in. "muted" is for cards you can't
// play yet. Holds still for reduced motion.
import { PulsingBorder } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export type BorderMode = "build" | "thinking" | "done" | "muted";

interface Look {
  colors: string[];
  speed: number;
  intensity: number;
  thickness: number;
}

const LOOK: Record<BorderMode, Look> = {
  build: { colors: ["#6e5cf2", "#5b9cff", "#a78bfa"], speed: 0.35, intensity: 0.35, thickness: 0.05 },
  thinking: { colors: ["#6e5cf2", "#5b9cff", "#e879f9"], speed: 1.2, intensity: 0.6, thickness: 0.07 },
  done: { colors: ["#8c7dfb", "#9cc2ff"], speed: 0.2, intensity: 0.3, thickness: 0.045 },
  muted: { colors: ["#b2a9ff", "#cbc9da"], speed: 0.15, intensity: 0.2, thickness: 0.04 },
};

interface Props {
  mode: BorderMode;
  /** Corner roundness of the glow, 0 to 1, relative to the card's size. */
  roundness?: number;
  className?: string;
  children: ReactNode;
}

/** Wraps a card: the glow is drawn underneath it, so the card itself stays exactly as it is. */
export function ShaderBorder({ mode, roundness = 0.1, className = "", children }: Props) {
  const still = useReducedMotion();
  const look = LOOK[mode];
  return (
    <div className={`relative isolate ${className}`}>
      <PulsingBorder
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 -z-10"
        colorBack="#00000000"
        colors={look.colors}
        speed={still ? 0 : look.speed}
        intensity={look.intensity}
        thickness={look.thickness}
        roundness={roundness}
        softness={1}
        pulse={0}
        smoke={0}
        bloom={0.2}
        spots={3}
        spotSize={0.7}
        scale={1}
        margin={0}
      />
      {children}
    </div>
  );
}
