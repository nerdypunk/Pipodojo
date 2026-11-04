// The message cube: a little 3D puzzle cube hovering over the empty corner of the lesson's builder
// card, on computers only (phones never load it). It builds itself live from the pieces you tap,
// showing which ones fit (see MessageCubeCanvas and game/messageCube.ts). It only shows where it
// covers no words: it measures the card each time it changes, finds the biggest empty square
// along the right edge (lib/freeSpot.ts), and hides itself if there's none. Purely decorative:
// Pipo's answer and the stars say the same thing in words.
import { Component, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { Mission } from "../engine/types.ts";
import { cubePieces, cubeVerdict } from "../game/messageCube.ts";
import { freeSpot, type Spot } from "../lib/freeSpot.ts";
import { useLang } from "../i18n/index.tsx";
import { TOUCH } from "./device.ts";
import type { CubeStage } from "./MessageCubeCanvas.tsx";

const MessageCubeCanvas = lazy(() => import("./MessageCubeCanvas.tsx"));

/** Computers with the two-column lesson layout. */
const DESKTOP = "(min-width: 768px) and (pointer: fine)";
const STILL = "(prefers-reduced-motion: reduce)";
/** Things in the card drawn as a shape of their own (pieces, badges, the message bubble, the result). */
const SHAPES = 'button, img, svg, [class*="bg-"], [class*="ring-"]';
const ROOM = { max: 230, min: 136, edge: 12, gap: 10 };

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Small moves don't count, so the cube doesn't jitter while pieces pop. */
const near = (a: Spot | null, b: Spot | null) =>
  a === b || (!!a && !!b && Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 6 && Math.abs(a.size - b.size) < 6);

/**
 * Everything in the card the cube must not cover, relative to the card: each line of words (just
 * the words, not the full-width box they sit in) and every shape. Skips the cube itself.
 */
function taken(el: HTMLElement, box: DOMRect) {
  const rects: DOMRect[] = [];
  const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.textContent?.trim() && !node.parentElement?.closest("[data-cube]") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const range = document.createRange();
  for (let node = text.nextNode(); node; node = text.nextNode()) {
    range.selectNodeContents(node);
    rects.push(...range.getClientRects());
  }
  for (const shape of el.querySelectorAll(SHAPES)) {
    // Skip the cube, and see-through decorations like the glow around the pieces.
    if (shape.closest("[data-cube]") || shape.classList.contains("pointer-events-none")) continue;
    const r = shape.getBoundingClientRect();
    // Skip wrappers as big as the card itself.
    if (r.width * r.height < box.width * box.height * 0.6) rects.push(r);
  }
  return rects
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }));
}

/** The biggest empty square in the card, kept up to date as the card changes. */
function useFreeSpot(area: RefObject<HTMLElement | null>, on: boolean): Spot | null {
  const [spot, setSpot] = useState<Spot | null>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (!on || !el) return;
    // Measured the moment the card changes and applied before the next paint, so the cube is never
    // seen over a piece that just got wider.
    const find = () => {
      const box = el.getBoundingClientRect();
      const next = freeSpot(box.width, box.height, taken(el, box), ROOM);
      return (prev: Spot | null) => (near(prev, next) ? prev : next);
    };
    const measure = () => flushSync(() => setSpot(find()));
    setSpot(find());
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    // Taps, results and translations change the card's words; the cube's own caption doesn't count.
    const changes = new MutationObserver((records) => {
      if (records.some((r) => !(r.target instanceof Element ? r.target : r.target.parentElement)?.closest("[data-cube]"))) measure();
    });
    changes.observe(el, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed", "class"] });
    // Fonts arrive late (Japanese loads in slices as new characters show up) and make words wider.
    void document.fonts?.ready.then(measure);
    document.fonts?.addEventListener("loadingdone", measure);
    // Pieces and results pop in a little smaller; measure again once they've settled.
    el.addEventListener("animationend", measure);
    return () => {
      el.removeEventListener("animationend", measure);
      document.fonts?.removeEventListener("loadingdone", measure);
      resize.disconnect();
      changes.disconnect();
    };
  }, [area, on]);
  return on ? spot : null;
}

/** True while the element is at least partly on screen. */
function useOnScreen(ref: RefObject<HTMLElement | null>, on: boolean): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const watch = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting));
    watch.observe(el);
    return () => watch.disconnect();
  }, [ref, on]);
  return visible;
}

interface Props {
  mission: Mission;
  picks: readonly string[];
  stage: CubeStage;
  stars: number | null;
  /** The card the cube hovers over (positioned, so the cube can sit inside it). */
  area: RefObject<HTMLElement | null>;
  /** Hidden while something else needs the attention (Pipo's floating phone). */
  hidden?: boolean;
}

export function MessageCube({ mission, picks, stage, stars, area, hidden = false }: Props) {
  const desktop = useMedia(DESKTOP) && !TOUCH;
  const still = useMedia(STILL);
  const { t } = useLang();
  const pieces = useMemo(() => cubePieces(mission), [mission]);
  const spot = useFreeSpot(area, desktop);
  // Once loaded, the 3D stays put while hidden (rebuilding it costs more than keeping it), just paused.
  const last = useRef<Spot | null>(null);
  if (spot) last.current = spot;
  const self = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(self, desktop && !!last.current);
  if (!desktop || !last.current) return null;
  const shown = !!spot && !hidden;
  const at = last.current;
  // Live, like the cube: what the message so far looks like.
  const caption = pieces.some((p) => picks.includes(p.id)) ? t.cube[cubeVerdict(pieces, picks)] : t.cube.building;
  return (
    <Quiet>
      <div
        ref={self}
        data-cube=""
        aria-hidden="true"
        className={`pointer-events-none absolute z-20 transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
        style={{ left: at.x, top: at.y, width: at.size, height: at.size }}
      >
        <Suspense fallback={null}>
          <MessageCubeCanvas pieces={pieces} picks={picks} stage={stage} stars={stars} still={still} paused={!shown || !onScreen} />
        </Suspense>
        <p
          key={caption}
          className="pop-in absolute bottom-0 left-1/2 max-w-full -translate-x-1/2 rounded-full bg-white/85 px-2.5 py-0.5 text-center text-[11px] leading-tight font-black whitespace-nowrap text-brand-700 shadow-sm ring-1 ring-white"
        >
          {caption}
        </p>
      </div>
    </Quiet>
  );
}

/** If the cube can't draw (no 3D on this computer, a failed download), it just isn't there. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
