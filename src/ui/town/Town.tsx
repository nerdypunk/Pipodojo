// Pipodojo Town: the overworld. A 3D town where each persona lives in their own place; click
// one to see their paths. Pipo's garage changes your Pipo's look. The buttons along the bottom
// do the same as clicking the town, for keyboards and screen readers, and stand in for the town
// if a browser can't draw 3D.
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { missions } from "../../app/missions.ts";
import type { Persona } from "../../engine/types.ts";
import { pathsOf } from "../../game/paths.ts";
import type { PipoLook } from "../../game/pipoLook.ts";
import { personasIn } from "../../game/personas.ts";
import { useLang } from "../../i18n/index.tsx";
import { LangSwitch } from "../LangSwitch.tsx";
import type { PlaceId } from "../../game/townLayout.ts";
import { Pipo } from "../Pipo.tsx";
import type { PlaceTag } from "./TownCanvas.tsx";

const REPO_URL = "https://github.com/nerdypunk/Pipodojo";
const SITE_URL = "https://nerdypunk.dev";

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
  /** Days in a row (0 if the streak has lapsed). */
  streak: number;
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

export function Town({ look, stars, streak, onVisit, onGarage }: Props) {
  const [hovered, setHovered] = useState<PlaceId | null>(null);
  const [selected, setSelected] = useState<PlaceId | null>(null);
  const [has3D] = useState(canDraw3D);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // The 3D places set a pointer cursor on hover; never leave it behind.
  useEffect(() => () => void (document.body.style.cursor = ""), []);
  const total = Object.values(stars).reduce((sum, s) => sum + s, 0);
  const { lang, t } = useLang();
  const personas = personasIn(lang);

  const tags = useMemo(() => {
    const result = {} as Record<PlaceId, PlaceTag>;
    for (const persona of personas) {
      const paths = pathsOf(persona.id, lang);
      const playable = missions.filter((m) => m.persona === persona.id);
      const earned = playable.reduce((sum, m) => sum + (stars[m.id] ?? 0), 0);
      const finished = paths.filter((path) => {
        const lessons = missions.filter((m) => m.path === path.id);
        return lessons.length > 0 && lessons.every((m) => (stars[m.id] ?? 0) > 0);
      }).length;
      result[persona.id] = {
        title: `${persona.emoji} ${persona.name}`,
        sub: t.town.tagSub(persona.blurb, paths.length),
        ...(playable.length > 0 ? { progress: `★ ${earned}/${playable.length * 3}` } : {}),
        ...(finished > 0 ? { badge: `🏅${finished > 1 ? `×${finished}` : ""}` } : {}),
        open: true,
        visit: t.town.visit,
      };
    }
    result.garage = { title: `🔧 ${t.town.garage}`, sub: t.town.garageSub, open: true, visit: t.town.visit };
    return result;
    // personas and t follow lang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars, lang]);

  const go = (id: PlaceId) => {
    if (id === "garage") onGarage();
    else onVisit(id);
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
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 md:gap-3 md:p-6">
        <div className="glass pointer-events-auto min-w-0 rounded-2xl px-3 py-2 md:px-4 md:py-2.5">
          <p className="text-[11px] font-black tracking-wide text-brand-700 uppercase md:text-xs">{t.town.kicker}</p>
          <h1 className="text-lg leading-tight font-black text-ink md:text-2xl">{t.town.title}</h1>
          <p className="hidden text-sm font-semibold text-gray-600 sm:block">{t.town.hint}</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <span className="glass flex items-center gap-1 rounded-full px-3 py-2 text-sm font-black text-orange-600" title={t.town.streakTitle}>
            <span aria-hidden="true">🔥</span>
            {streak} <span className="sr-only">{t.town.streak}</span>
          </span>
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black text-brand-800">
            <span className="text-amber-500" aria-hidden="true">
              ★
            </span>
            {total} <span className="sr-only">{t.town.stars}</span>
          </span>
          <button
            type="button"
            onClick={() => select("garage")}
            className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold text-brand-700 transition hover:bg-white/80 md:px-4"
            aria-label={t.town.garage}
          >
            <span aria-hidden="true">🔧</span>
            <span className="hidden sm:inline">{t.town.garage}</span>
          </button>
          <LangSwitch />
        </div>
      </header>

      {/* Bottom: the same places as buttons, and who powers Pipo. On tall phone screens the island
          sits mid-screen, so lift these up to tuck under it instead of hugging the bottom edge. */}
      <nav className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 max-sm:bottom-[8dvh] md:p-6" aria-label={t.town.places}>
        {/* Four equal, chunky buttons (2×2 on phones, a row on wider screens) that press down when tapped. */}
        <div className="grid w-full max-w-sm grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-none">
          {personas.map((persona) => {
            const on = hovered === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => select(persona.id)}
                onMouseEnter={() => !selected && setHovered(persona.id)}
                onMouseLeave={() => !selected && setHovered(null)}
                onFocus={() => !selected && setHovered(persona.id)}
                onBlur={() => !selected && setHovered(null)}
                className={`flex min-h-13 min-w-0 items-center gap-2 rounded-2xl border-b-4 py-2 pr-2.5 pl-2 text-left text-sm leading-tight font-extrabold shadow-[0_10px_24px_-12px_rgb(45_36_112/0.55)] transition-[background-color,color,border-color,transform] duration-150 active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none sm:pr-3.5 ${
                  on ? "border-brand-800 bg-brand-600 text-white" : "border-brand-200 bg-white text-ink"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl ${on ? "bg-white/20" : "bg-brand-50"}`}
                  aria-hidden="true"
                >
                  {persona.emoji}
                </span>
                <span className="min-w-0 flex-1">{persona.name}</span>
                {tags[persona.id].badge && <span aria-label={t.town.pathComplete}>{tags[persona.id].badge}</span>}
                <span className={`text-lg leading-none ${on ? "text-white/80" : "text-brand-400"}`} aria-hidden="true">
                  ›
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-start gap-1 rounded-2xl bg-white/70 px-3.5 py-2 text-xs sm:items-center font-extrabold text-brand-800 ring-1 ring-white sm:flex-row sm:gap-2 sm:rounded-full sm:py-1">
          {/* Both lines share one shape (icon in a fixed slot, same size and weight), so they sit
              as a matched pair when stacked on phones. */}
          <p className="inline-flex items-center gap-1.5">
            <span className="w-4 text-center" aria-hidden="true">
              ⚡
            </span>
            {t.common.poweredBy}
          </p>
          <span className="hidden text-brand-300 sm:inline" aria-hidden="true">
            ·
          </span>
          <p className="inline-flex items-center gap-1.5">
            <span className="w-4 text-center" aria-hidden="true">
              💻
            </span>
            <span>
            {t.common.openSourceA}{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
              {t.common.openSourceLink}
            </a>{" "}
            {t.common.openSourceBy}{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
              nerdypunk.dev
            </a>
            </span>
          </p>
        </div>
      </nav>
    </div>
  );
}

function Loading() {
  const { t } = useLang();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <Pipo mood="thinking" className="h-28 w-28" />
      <p className="glass rounded-full px-4 py-1.5 text-sm font-extrabold text-brand-700">{t.town.loading}</p>
    </div>
  );
}
