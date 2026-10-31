// Pipo's "brain": a softly drifting network (Vanta NET) that lights up and spins faster
// while Pipo is thinking. Loaded on demand, wide screens only, and skipped for reduced motion.
import { useEffect, useRef, useState } from "react";
import type { VantaNetEffect } from "vanta/dist/vanta.net.min";

export type BrainMode = "idle" | "thinking" | "done";

const LOOK: Record<BrainMode, { color: number; maxDistance: number; spin: number }> = {
  idle: { color: 0x8c7dfb, maxDistance: 19, spin: 1 },
  thinking: { color: 0x5a46e0, maxDistance: 27, spin: 10 },
  done: { color: 0xb2a9ff, maxDistance: 17, spin: 0.6 },
};

const CAPTION: Record<BrainMode, string> = {
  idle: "Waiting for your message",
  thinking: "Pipo is thinking…",
  done: "All done",
};

export function PipoBrain({ mode }: { mode: BrainMode }) {
  const el = useRef<HTMLDivElement>(null);
  const effect = useRef<VantaNetEffect | null>(null);
  const [ready, setReady] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wide || still || !el.current) return;

    let cancelled = false;
    Promise.all([import("three"), import("vanta/dist/vanta.net.min")])
      .then(([THREE, { default: net }]) => {
        if (cancelled || !el.current) return;
        const NET = typeof net === "function" ? net : net.default;
        effect.current = NET({
          el: el.current,
          THREE,
          mouseControls: true,
          touchControls: false,
          gyroControls: false,
          backgroundColor: 0xe8e6ff,
          backgroundAlpha: 0,
          points: 8,
          spacing: 16,
          showDots: true,
          ...LOOK[modeRef.current],
        });
        applyMode(effect.current, modeRef.current);
        setReady(true);
      })
      .catch(() => {
        // No WebGL or the chunk failed: the panel just shows its caption.
      });

    return () => {
      cancelled = true;
      effect.current?.destroy();
      effect.current = null;
    };
  }, []);

  useEffect(() => {
    if (effect.current) applyMode(effect.current, mode);
  }, [mode]);

  return (
    <div className="relative hidden min-h-36 flex-1 overflow-hidden rounded-2xl bg-white/35 md:block" aria-hidden="true">
      <div
        ref={el}
        className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"}`}
      />
      <span
        className={`absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-bold ${
          mode === "thinking" ? "text-brand-700" : "text-gray-500"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            mode === "thinking" ? "animate-pulse bg-brand-500 motion-reduce:animate-none" : "bg-gray-300"
          }`}
        />
        {CAPTION[mode]}
      </span>
    </div>
  );
}

function applyMode(net: VantaNetEffect, mode: BrainMode) {
  const { color, maxDistance, spin } = LOOK[mode];
  net.setOptions({ color, maxDistance });
  // Vanta has no speed option for NET, so scale each point's own rotation rate.
  for (const point of net.points ?? []) {
    point.baseR ??= point.r;
    point.r = point.baseR * spin;
  }
}
