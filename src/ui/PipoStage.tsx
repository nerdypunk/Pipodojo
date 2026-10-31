// Pipo's stage: Pipo stands in a glowing violet halo (Vanta HALO) that swirls faster and
// brighter while Pipo is thinking. The halo loads on demand; a CSS glow shows until it does,
// and stays on its own for reduced motion or when WebGL isn't available.
import { useEffect, useRef, useState } from "react";
import type { VantaEffect } from "vanta/dist/vanta.halo.min";
import { Pipo, type Mood } from "./Pipo.tsx";

export type StageMode = "idle" | "thinking" | "done";

const LOOK: Record<StageMode, { speed: number; amplitudeFactor: number; size: number }> = {
  idle: { speed: 0.7, amplitudeFactor: 1.2, size: 1.8 },
  thinking: { speed: 2.8, amplitudeFactor: 2.6, size: 2.4 },
  done: { speed: 0.5, amplitudeFactor: 1.0, size: 1.6 },
};

const CAPTION: Record<StageMode, string> = {
  idle: "Waiting for your message",
  thinking: "Pipo is thinking…",
  done: "Here's Pipo's answer",
};

interface Props {
  title: string;
  mode: StageMode;
  mood: Mood;
}

export function PipoStage({ title, mode, mood }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const effect = useRef<VantaEffect | null>(null);
  const [ready, setReady] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !el.current) return;

    let cancelled = false;
    Promise.all([import("three"), import("vanta/dist/vanta.halo.min")])
      .then(([THREE, { default: halo }]) => {
        if (cancelled || !el.current) return;
        const HALO = typeof halo === "function" ? halo : halo.default;
        effect.current = HALO({
          el: el.current,
          THREE,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          backgroundColor: 0x3b2d96,
          baseColor: 0x8c7dfb,
          color2: 0xd3cfff,
          ...LOOK[modeRef.current],
        });
        setReady(true);
      })
      .catch(() => {
        // No WebGL or the chunk failed: the CSS glow stays.
      });

    // The stage changes height with the card (e.g. when the answer comes in); Vanta only
    // watches the window, so tell it when the stage itself resizes.
    const observer = new ResizeObserver(() => effect.current?.resize());
    observer.observe(el.current);

    return () => {
      cancelled = true;
      observer.disconnect();
      effect.current?.destroy();
      effect.current = null;
    };
  }, []);

  useEffect(() => {
    effect.current?.setOptions(LOOK[mode]);
  }, [mode]);

  const thinking = mode === "thinking";
  return (
    <div className="relative min-h-44 flex-1 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_55%,#8c7dfb_0%,#3b2d96_70%)]">
      <div
        ref={el}
        className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />
      <h1 className="absolute top-3 left-4 text-lg font-black text-white md:text-xl">{title}</h1>
      <div className="absolute inset-x-0 top-10 bottom-11 flex items-center justify-center">
        <Pipo mood={mood} className="h-full max-h-32 w-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]" />
      </div>
      <span
        className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold whitespace-nowrap text-white backdrop-blur-sm"
        aria-live="polite"
      >
        <span
          className={`h-2 w-2 rounded-full ${thinking ? "animate-pulse bg-amber-300 motion-reduce:animate-none" : "bg-white/60"}`}
        />
        {CAPTION[mode]}
      </span>
    </div>
  );
}
