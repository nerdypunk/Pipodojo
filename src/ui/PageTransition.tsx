// Full-page screen transitions using swup's overlay and slide themes (their CSS), driven by
// the app instead of swup's router: Pipodojo is one page, so we set swup's lifecycle classes
// on <html> ourselves.
//   1. is-changing + is-leaving + is-animating: a dark skewed panel sweeps over the page while
//      the old screen slides away.
//   2. The screen swaps under the panel.
//   3. is-rendering: the panel sweeps off and the new screen slides in.
import "@swup/overlay-theme/src/index.css";
import "@swup/slide-theme/src/index.css";
import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type SweepDirection = "to-right" | "to-left";

/** Matches --swup-overlay-theme-delay + --swup-overlay-theme-duration in index.css, plus a frame. */
const HALF_MS = 560;

// Plain timers, not requestAnimationFrame: rAF never fires in a hidden tab, which would leave the
// panel stuck over the page.
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
/** Make the browser apply the current styles now, so the next class change animates from them. */
const settle = (el: HTMLElement) => void el.offsetWidth;

export function usePageTransition() {
  const [direction, setDirection] = useState<SweepDirection>("to-right");
  const busy = useRef(false);

  const go = useCallback(async (dir: SweepDirection, swap: () => void) => {
    if (busy.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      swap();
      return;
    }
    busy.current = true;
    const html = document.documentElement;
    try {
      flushSync(() => setDirection(dir));
      html.classList.toggle("swup-theme-reverse", dir === "to-left");
      settle(html);
      html.classList.add("is-changing", "is-leaving", "is-animating");
      await wait(HALF_MS);

      flushSync(swap);
      window.scrollTo(0, 0);
      html.classList.remove("is-leaving");
      settle(html);
      await wait(20);
      html.classList.remove("is-animating");
      html.classList.add("is-rendering");
      await wait(HALF_MS);
    } finally {
      html.classList.remove("is-changing", "is-leaving", "is-animating", "is-rendering", "swup-theme-reverse");
      busy.current = false;
    }
  }, []);

  return { direction, go };
}

/** The panel that sweeps across the page. Render once, outside the screens. */
export function TransitionOverlay({ direction }: { direction: SweepDirection }) {
  return <div className="swup-transition-overlay" data-direction={direction} aria-hidden="true" />;
}
