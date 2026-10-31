// Pipodojo Town: the overworld. A 3D town where each persona lives in their own place; click
// one to see their paths. Pipo's garage changes your Pipo's look. The buttons along the bottom
// do the same as clicking the town, for keyboards and screen readers, and stand in for the town
// if a browser can't draw 3D.
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { missions } from "../../app/missions.ts";
import type { Persona } from "../../engine/types.ts";
import { pathsOf } from "../../game/paths.ts";
import type { PipoLook } from "../../game/pipoLook.ts";
import { PERSONAS } from "../../game/personas.ts";
import type { PlaceId } from "../../game/townLayout.ts";
import { Pipo } from "../Pipo.tsx";
import type { PlaceTag } from "./TownCanvas.tsx";

const loadCanvas = () => import("./TownCanvas.tsx");
const TownCanvas = lazy(loadCanvas);

/** Starts downloading the 3D town early (e.g. while the player picks a look), so it opens at once. */
export function preloadTown() {
  void loadCanvas().catch(() => {});
}

interface Props {
  look: PipoLook;
  /** Best stars per lesson id this visit. */
  stars: Readonly<Record<string, number>>;
  onVisit: (persona: Persona) => void;
  onGarage: () => void;
}

function canDraw3D(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Town({ look, stars, onVisit, onGarage }: Props) {
  const [hovered, setHovered] = useState<PlaceId | null>(null);
  const [selected, setSelected] = useState<PlaceId | null>(null);
  const [has3D] = useState(canDraw3D);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // The 3D places set a pointer cursor on hover; never leave it behind.
  useEffect(() => () => void (document.body.style.cursor = ""), []);
  const total = Object.values(stars).reduce((sum, s) => sum + s, 0);

  const tags = useMemo(() => {
    const result = {} as Record<PlaceId, PlaceTag>;
    for (const persona of PERSONAS) {
      const paths = pathsOf(persona.id);
      const playable = missions.filter((m) => m.persona === persona.id);
      const earned = playable.reduce((sum, m) => sum + (stars[m.id] ?? 0), 0);
      const finished = paths.filter((path) => {
        const lessons = missions.filter((m) => m.path === path.id);
        return lessons.length > 0 && lessons.every((m) => (stars[m.id] ?? 0) > 0);
      }).length;
      result[persona.id] = {
        title: `${persona.emoji} ${persona.name}`,
        sub: `${persona.blurb} ${paths.length} paths.`,
        ...(playable.length > 0 ? { progress: `★ ${earned}/${playable.length * 3}` } : {}),
        ...(finished > 0 ? { badge: `🏅${finished > 1 ? `×${finished}` : ""}` } : {}),
        open: true,
      };
    }
    result.garage = { title: "🔧 Pipo's garage", sub: "Change how your Pipo looks.", open: true };
    result.lot = { title: "🚧 Coming soon", sub: "Someone new is moving in. More people for Pipo to help!", open: false };
    return result;
  }, [stars]);

  const go = (id: PlaceId) => {
    if (id === "garage") onGarage();
    else if (id !== "lot") onVisit(id);
  };
  // Clicking flies the camera in; the screen moves on once it lands.
  const select = (id: PlaceId) => {
    if (selected || !tags[id].open) return;
    if (!has3D) return go(id);
    setSelected(id);
    setHovered(id);
  };
  const arrive = () => {
    if (selected) go(selected);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {has3D ? (
        <Suspense fallback={<Loading />}>
          <div className="absolute inset-0">
            <TownCanvas
              look={look}
              tags={tags}
              hovered={hovered}
              onHover={setHovered}
              selected={selected}
              onSelect={select}
              onArrive={arrive}
              still={still}
            />
          </div>
        </Suspense>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Pipo mood="happy" className="h-40 w-40" />
        </div>
      )}

      {/* Top: title, stars and the garage */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 md:p-6">
        <div className="glass pointer-events-auto rounded-2xl px-4 py-2.5">
          <p className="text-xs font-black tracking-wide text-brand-700 uppercase">Pipodojo Town</p>
          <h1 className="text-2xl font-black text-ink">Who should Pipo help?</h1>
          <p className="text-sm font-semibold text-gray-600">Click a place in town to see their paths.</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black text-brand-800">
            <span className="text-amber-500" aria-hidden="true">
              ★
            </span>
            {total} <span className="sr-only">stars</span>
          </span>
          <button
            type="button"
            onClick={() => select("garage")}
            className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold text-brand-700 transition hover:bg-white/80"
          >
            <span aria-hidden="true">🔧</span> Pipo's garage
          </button>
        </div>
      </header>

      {/* Bottom: the same places as buttons, and who powers Pipo */}
      <nav className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 md:p-6" aria-label="Places in town">
        <div className="glass flex gap-1.5 rounded-2xl p-1.5">
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => select(persona.id)}
              onMouseEnter={() => !selected && setHovered(persona.id)}
              onMouseLeave={() => !selected && setHovered(null)}
              onFocus={() => !selected && setHovered(persona.id)}
              onBlur={() => !selected && setHovered(null)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-extrabold transition ${
                hovered === persona.id ? "bg-brand-600 text-white" : "text-ink hover:bg-white/80"
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                {persona.emoji}
              </span>
              {persona.name}
              {tags[persona.id].badge && <span aria-label="Path complete">{tags[persona.id].badge}</span>}
            </button>
          ))}
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-brand-800 ring-1 ring-white">
          <span aria-hidden="true">⚡</span> Pipo is powered by Meta's Muse Spark
        </p>
      </nav>
    </div>
  );
}

function Loading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <Pipo mood="thinking" className="h-28 w-28" />
      <p className="glass rounded-full px-4 py-1.5 text-sm font-extrabold text-brand-700">Building the town…</p>
    </div>
  );
}
