// Animated shader border (Paper PulsingBorder) for picked prompt pieces. It reacts to
// what Pipo is doing: a soft glow while you build, bright and fast while Pipo thinks,
// dim once the answer is in. Holds still for reduced motion.
import { PulsingBorder } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

export type GlowMode = "build" | "thinking" | "done";

const LOOK: Record<
  GlowMode,
  { colors: string[]; speed: number; intensity: number; pulse: number; smoke: number; bloom: number; thickness: number }
> = {
  build: { colors: ["#6e5cf2", "#9cc2ff", "#b2a9ff"], speed: 0.5, intensity: 0.3, pulse: 0.15, smoke: 0.15, bloom: 0.3, thickness: 0.07 },
  thinking: { colors: ["#8c7dfb", "#5b9cff", "#f0abfc", "#fcd34d"], speed: 2.4, intensity: 0.8, pulse: 0.7, smoke: 0.55, bloom: 0.9, thickness: 0.13 },
  done: { colors: ["#b2a9ff", "#d3cfff"], speed: 0.2, intensity: 0.18, pulse: 0, smoke: 0.05, bloom: 0.15, thickness: 0.05 },
};

export function PieceGlow({ mode }: { mode: GlowMode }) {
  const still = useReducedMotion();
  const look = LOOK[mode];
  return (
    <PulsingBorder
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[5px] z-0"
      colorBack="#00000000"
      colors={look.colors}
      speed={still ? 0 : look.speed}
      intensity={look.intensity}
      pulse={look.pulse}
      smoke={look.smoke}
      smokeSize={0.5}
      bloom={look.bloom}
      roundness={0.45}
      thickness={look.thickness}
      softness={0.8}
      spots={4}
      spotSize={0.5}
      scale={1}
      margin={0}
    />
  );
}
