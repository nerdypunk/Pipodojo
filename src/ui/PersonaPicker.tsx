// "Pick your path": persona cards in a swipeable carousel (egjs Flicking).
// Only available personas can be started; the others are "Coming soon" placeholders.
import Flicking from "@egjs/flicking";
import { Arrow, Pagination, Perspective } from "@egjs/flicking-plugins";
import "@egjs/flicking/dist/flicking.css";
import "@egjs/flicking-plugins/dist/pagination.css";
import { useEffect, useRef } from "react";
import type { Persona } from "../engine/types.ts";
import { PERSONAS, type PersonaCard } from "../game/personas.ts";
import { Backdrop } from "./Backdrop.tsx";
import { Button } from "./Button.tsx";
import { Pipo } from "./Pipo.tsx";

export function PersonaPicker({ onStart }: { onStart: (persona: Persona) => void }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const flicking = useRef<Flicking | null>(null);

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
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-6 p-3 md:p-6">
      <Backdrop />
      <header className="flex flex-col items-center gap-2 text-center">
        <Pipo mood="happy" className="h-16 w-16 drop-shadow-[0_6px_16px_rgba(45,36,112,0.35)]" />
        <p className="text-lg font-black tracking-tight text-brand-700">Pipodojo</p>
        <h1 className="text-3xl font-black text-ink md:text-4xl">Pick your path</h1>
        <p className="font-semibold text-gray-600">Who are you helping Pipo help today?</p>
      </header>

      <div ref={wrapper} className="relative">
        <div ref={viewport} className="flicking-viewport py-4">
          <div className="flicking-camera">
            {PERSONAS.map((persona, i) => (
              <PersonaPanel key={persona.id} persona={persona} onFocus={() => focus(i)} onStart={onStart} />
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

function PersonaPanel({
  persona,
  onFocus,
  onStart,
}: {
  persona: PersonaCard;
  onFocus: () => void;
  onStart: (persona: Persona) => void;
}) {
  return (
    <article
      className="glass mx-2.5 flex w-64 flex-col gap-3 rounded-3xl p-3 md:w-72"
      onClick={onFocus}
      aria-label={persona.available ? persona.name : `${persona.name}, coming soon`}
    >
      <div
        className={`relative flex h-36 items-center justify-center rounded-2xl bg-gradient-to-br md:h-40 ${persona.tint} ${
          persona.available ? "" : "grayscale-[60%]"
        }`}
      >
        <span className="text-6xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)]" aria-hidden="true">
          {persona.emoji}
        </span>
        {!persona.available && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-extrabold text-brand-800">
            Coming soon
          </span>
        )}
      </div>
      <div className="px-1">
        <h2 className="text-xl font-black">{persona.name}</h2>
        <p className="text-[15px] leading-snug font-semibold text-gray-600">{persona.blurb}</p>
      </div>
      {persona.available ? (
        <Button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onStart(persona.id);
          }}
        >
          Start
        </Button>
      ) : (
        <Button tone="plain" className="w-full" disabled>
          Coming soon
        </Button>
      )}
    </article>
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
