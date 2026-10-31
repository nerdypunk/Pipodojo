// Pipo's stage: Pipo hovers on the left, and its "thought" is a Siri-style orb on the right
// (smoothui SiriOrb) that grows and churns while Pipo is thinking. A dynamic island
// (smoothui) at the bottom shows what Pipo is doing.
import { motion, useReducedMotion } from "motion/react";
import DynamicIsland from "@/components/smoothui/dynamic-island";
import SiriOrb from "@/components/smoothui/siri-orb";
import { Pipo, type Mood } from "./Pipo.tsx";

export type StageMode = "idle" | "thinking" | "done";

const ORB_COLORS = { bg: "#1b1640", c1: "#8c7dfb", c2: "#9cc2ff", c3: "#5a46e0", c4: "#d3cfff" };
const ORB_SCALE: Record<StageMode, number> = { idle: 0.6, thinking: 1, done: 0.72 };
/** The island's built-in views, reused for Pipo's three states. */
const ISLAND_VIEW = { idle: "idle", thinking: "ring", done: "timer" } as const;

interface Props {
  title: string;
  mode: StageMode;
  mood: Mood;
  /** Stars for the island once Pipo has answered. */
  stars: number | null;
}

export function PipoStage({ title, mode, mood, stars }: Props) {
  const still = useReducedMotion();
  return (
    <div className="relative min-h-36 flex-1 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,#5a46e0_0%,#2d2470_55%,#1b1640_100%)] md:min-h-48">
      <h1 className="absolute top-3 left-4 text-lg font-black text-white md:text-xl">{title}</h1>

      <div className="absolute inset-x-0 top-10 bottom-14 flex items-center justify-center gap-2">
        <Pipo mood={mood} className="h-full max-h-24 w-auto drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] md:max-h-32" />

        {/* Thought: a trail of bubbles from Pipo up to the orb */}
        <div className="flex items-end gap-1.5 self-center pb-2" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
          <span className="mb-1.5 h-2.5 w-2.5 rounded-full bg-white/60" />
        </div>
        {/* Smaller orb on phones */}
        <div className="-mx-3 scale-75 md:mx-0 md:scale-100">
          <motion.div
            className="-mt-6"
            animate={{ scale: ORB_SCALE[mode] }}
            transition={still ? { duration: 0 } : { type: "spring", bounce: 0.35, duration: 0.6 }}
            aria-hidden="true"
          >
            <SiriOrb size="104px" state={mode} colors={ORB_COLORS} />
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-2.5 flex justify-center" role="status" aria-live="polite">
        <DynamicIsland
          showControls={false}
          view={ISLAND_VIEW[mode]}
          idleContent={<IslandText dot="bg-emerald-400">Pipo is ready</IslandText>}
          ringContent={
            <IslandText orb>
              Pipo is thinking…
            </IslandText>
          }
          timerContent={
            <IslandText dot="bg-amber-300">
              Pipo answered
              {stars !== null && (
                <span className="tracking-wider" aria-label={`${stars} out of 3 stars`}>
                  <span className="text-amber-300">{"★".repeat(stars)}</span>
                  <span className="text-white/30">{"★".repeat(3 - stars)}</span>
                </span>
              )}
            </IslandText>
          }
        />
      </div>
    </div>
  );
}

function IslandText({ dot, orb, children }: { dot?: string; orb?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm font-bold whitespace-nowrap text-white">
      {orb ? (
        <SiriOrb size="18px" state="thinking" colors={ORB_COLORS} />
      ) : (
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      )}
      {children}
    </div>
  );
}
