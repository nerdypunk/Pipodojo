// "Pick a path": the three paths of the persona you visited in town, in a swipeable carousel
// (egjs Flicking). Paths whose lessons are built can be started; the others show "Coming soon".
import Flicking from "@egjs/flicking";
import { Arrow, Pagination, Perspective } from "@egjs/flicking-plugins";
import "@egjs/flicking/dist/flicking.css";
import "@egjs/flicking-plugins/dist/pagination.css";
import { useEffect, useRef } from "react";
import PixelTransition from "@/components/PixelTransition";
import type { Persona } from "../engine/types.ts";
import { missions } from "../app/missions.ts";
import { pathsOf, type PathCard } from "../game/paths.ts";
import { personaById } from "../game/personas.ts";
import { Button } from "./Button.tsx";
import { Pipo } from "./Pipo.tsx";
import { ShaderBorder } from "./ShaderBorder.tsx";

interface Props {
  persona: Persona;
  /** Best stars per lesson id this visit. */
  stars: Readonly<Record<string, number>>;
  onStart: (pathId: string) => void;
  onBack: () => void;
}

export function PathPicker({ persona, stars, onStart, onBack }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const flicking = useRef<Flicking | null>(null);
  const who = personaById(persona);
  const paths = pathsOf(persona);

  useEffect(() => {
    if (!viewport.current || !wrapper.current) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const carousel = new Flicking(viewport.current, {
      align: "center",
      bound: false,
      duration: still ? 0 : 400,
    });
    carousel.addPlugins(
      new Arrow({ parentEl: wrapper.current, prevElSelector: ".persona-prev", nextElSelector: ".persona-next" }),
      new Pagination({ parentEl: wrapper.current, selector: ".persona-dots", type: "bullet" }),
    );
    if (!still) carousel.addPlugins(new Perspective({ rotate: 0.6, scale: 0.15, perspective: 1000 }));
    flicking.current = carousel;
    return () => {
      carousel.destroy();
      flicking.current = null;
    };
  }, []);

  // Tapping a card that isn't in the middle brings it to the middle first.
  const focus = (index: number) => {
    const carousel = flicking.current;
    if (carousel && carousel.index !== index && !carousel.animating) void carousel.moveTo(index).catch(() => {});
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-5 p-3 md:p-6">
      <header className="relative flex flex-col items-center gap-1.5 text-center">
        {/* A chunky, easy-to-spot way home: in the flow on phones, pinned top-left on bigger screens */}
        <button
          type="button"
          onClick={onBack}
          className="mb-1 flex items-center gap-2 self-start rounded-2xl border-b-4 border-brand-800 bg-brand-600 py-2.5 pr-5 pl-3.5 text-base font-black text-white shadow-[0_10px_24px_-8px_rgb(45_36_112/0.6)] transition hover:bg-brand-700 active:translate-y-0.5 active:border-b-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none md:absolute md:top-0 md:left-0 md:mb-0"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ‹
          </span>
          <span aria-hidden="true" className="text-xl leading-none">
            🏘️
          </span>
          Back to town
        </button>
        <Pipo mood="happy" className="h-16 w-16 drop-shadow-[0_6px_16px_rgba(45,36,112,0.35)]" />
        <p className="text-sm font-black tracking-wide text-brand-700 uppercase">
          {who.emoji} {who.place} · {who.name}
        </p>
        <h1 className="text-3xl font-black text-ink md:text-4xl">Pick a path</h1>
        <p className="font-semibold text-gray-600">Three lessons each. Pipo gets a little more done in every one.</p>
      </header>

      <div ref={wrapper} className="relative">
        <div ref={viewport} className="flicking-viewport py-4">
          <div className="flicking-camera">
            {paths.map((path, i) => (
              <PathPanel key={path.id} path={path} stars={stars} onFocus={() => focus(i)} onStart={onStart} />
            ))}
          </div>
        </div>
        <ArrowButton side="prev" />
        <ArrowButton side="next" />
        <div className="persona-dots mt-2 flex justify-center" />
      </div>
    </div>
  );
}

function PathPanel({
  path,
  stars,
  onFocus,
  onStart,
}: {
  path: PathCard;
  stars: Readonly<Record<string, number>>;
  onFocus: () => void;
  onStart: (pathId: string) => void;
}) {
  const lessons = missions.filter((m) => m.path === path.id);
  const playable = lessons.length > 0;
  const earned = lessons.reduce((sum, m) => sum + (stars[m.id] ?? 0), 0);
  const art = (
    // Hovering the picture dissolves it in pixels into the path's lessons (React Bits PixelTransition).
    <PixelTransition
      className="rounded-2xl"
      aspectRatio="56%"
      gridSize={10}
      pixelColor="#ffffff"
      trigger="hover"
      firstContent={
        <div
          className={`relative flex h-full w-full items-center justify-center bg-gradient-to-br ${path.tint} ${
            playable ? "" : "grayscale-[60%]"
          }`}
        >
          <span className="text-6xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)]" aria-hidden="true">
            {path.emoji}
          </span>
          <span className="absolute top-2.5 right-2.5 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-extrabold text-brand-800">
            {playable ? `★ ${earned} of ${lessons.length * 3}` : "Coming soon"}
          </span>
        </div>
      }
      secondContent={
        <ol className="flex h-full w-full flex-col justify-center gap-1.5 bg-brand-900 px-5 text-left text-white">
          {path.lessons.map((name, i) => (
            <li key={name} className="flex items-center gap-2 text-sm font-bold">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-black">
                {i + 1}
              </span>
              <span className="flex-1">{name}</span>
              {!playable && (
                <span className="text-xs" aria-label="Locked">
                  🔒
                </span>
              )}
            </li>
          ))}
        </ol>
      }
    />
  );

  // A soft animated glow behind the card: lively on playable paths, quiet on the ones still to come.
  return (
    <ShaderBorder mode={playable ? "build" : "muted"} roundness={0.14} className="mx-2.5">
      <article
        className="glass flex w-64 flex-col gap-3 rounded-3xl p-3 md:w-72"
        onClick={onFocus}
        aria-label={playable ? path.name : `${path.name}, coming soon`}
      >
        {art}
        <div className="px-1">
          <h2 className="text-xl font-black">{path.name}</h2>
          <p className="text-[15px] leading-snug font-semibold text-gray-600">{path.blurb}</p>
        </div>
        {playable ? (
          <Button
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onStart(path.id);
            }}
          >
            {earned > 0 ? "Play again" : "Start"}
          </Button>
        ) : (
          <Button tone="plain" className="w-full" disabled>
            Coming soon
          </Button>
        )}
      </article>
    </ShaderBorder>
  );
}

function ArrowButton({ side }: { side: "prev" | "next" }) {
  return (
    <button
      type="button"
      aria-label={side === "prev" ? "Previous path" : "Next path"}
      className={`persona-${side} glass absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-[calc(50%+12px)] items-center justify-center rounded-full text-xl font-black text-brand-700 transition hover:bg-white/80 md:flex [&.flicking-arrow-disabled]:pointer-events-none [&.flicking-arrow-disabled]:opacity-30 ${
        side === "prev" ? "left-2" : "right-2"
      }`}
    >
      <span aria-hidden="true">{side === "prev" ? "‹" : "›"}</span>
    </button>
  );
}
