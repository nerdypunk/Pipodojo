// Animated shader border (Paper PulsingBorder) that frames a card. It follows what Pipo is
// doing: a soft drifting glow while you build, bright and fast while Pipo thinks, calm once
// the answer is in. "muted" is for cards you can't play yet. Holds still for reduced motion.
import { PulsingBorder } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

export type BorderMode = "build" | "thinking" | "done" | "muted";

interface Look {
  colors: string[];
  speed: number;
  intensity: number;
  pulse: number;
  smoke: number;
  bloom: number;
  thickness: number;
  spotSize: number;
}

const LOOK: Record<BorderMode, Look> = {
  build: { colors: ["#5a46e0", "#3b82f6", "#a78bfa"], speed: 0.6, intensity: 0.9, pulse: 0.2, smoke: 0.3, bloom: 0.4, thickness: 0.08, spotSize: 0.8 },
  thinking: {
    colors: ["#8c7dfb", "#5b9cff", "#f0abfc", "#fcd34d"],
    speed: 2.4,
    intensity: 1,
    pulse: 0.8,
    smoke: 0.6,
    bloom: 1,
    thickness: 0.12,
    spotSize: 0.9,
  },
  done: { colors: ["#8c7dfb", "#9cc2ff", "#c4b5fd"], speed: 0.3, intensity: 0.45, pulse: 0, smoke: 0.15, bloom: 0.3, thickness: 0.06, spotSize: 0.8 },
  muted: { colors: ["#9e9bb5", "#cbc9da"], speed: 0.2, intensity: 0.35, pulse: 0, smoke: 0.1, bloom: 0.2, thickness: 0.05, spotSize: 0.7 },
};

/** Place inside a `relative` card; it draws on the card's edge and never blocks clicks. */
export function ShaderBorder({ mode, roundness = 0.12 }: { mode: BorderMode; roundness?: number }) {
  const still = useReducedMotion();
  const look = LOOK[mode];
  return (
    <PulsingBorder
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[3px] z-10"
      colorBack="#00000000"
      colors={look.colors}
      speed={still ? 0 : look.speed}
      intensity={look.intensity}
      pulse={look.pulse}
      smoke={look.smoke}
      smokeSize={0.5}
      bloom={look.bloom}
      roundness={roundness}
      thickness={look.thickness}
      softness={0.8}
      spots={4}
      spotSize={look.spotSize}
      scale={1}
      margin={0}
    />
  );
}
