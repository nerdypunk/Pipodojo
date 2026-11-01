// Full-page screen transitions using swup's overlay and slide themes (their CSS), driven by
// the app instead of swup's router: Pipodojo is one page, so we set swup's lifecycle classes
// on <html> ourselves.
//   cover:   is-changing + is-leaving + is-animating. A dark skewed panel sweeps over the page
//            while the old screen slides away. The panel can stay there (e.g. under the lesson
//            complete box) for as long as needed.
//   uncover: the screen swaps under the panel, then is-rendering sweeps the panel off and the
//            new screen slides in.
// `go` does both in one move. With reduced motion the panel jumps instead of sweeping (see CSS).
import "@swup/overlay-theme/src/index.css";
import "@swup/slide-theme/src/index.css";
import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { TOUCH } from "./device.ts";
import { play } from "../app/sound.ts";

export type SweepDirection = "to-right" | "to-left";

/** Matches --swup-overlay-theme-delay + --swup-overlay-theme-duration in index.css, plus a frame. */
const HALF_MS = TOUCH ? 340 : 560;

// Plain timers, not requestAnimationFrame: rAF never fires in a hidden tab, which would leave the
// panel stuck over the page.
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
/** Make the browser apply the current styles now, so the next class change animates from them. */
const settle = (el: HTMLElement) => void el.offsetWidth;

const html = () => document.documentElement;
const clearClasses = () =>
  html().classList.remove("is-changing", "is-leaving", "is-animating", "is-rendering", "swup-theme-reverse");

export function usePageTransition() {
  const [direction, setDirection] = useState<SweepDirection>("to-right");
  const busy = useRef(false);
  const covered = useRef(false);

  /** Sweep the panel over the page and leave it there. Resolves once the page is covered. */
  const cover = useCallback(async (dir: SweepDirection): Promise<boolean> => {
    if (busy.current || covered.current) return false;
    busy.current = true;
    try {
      flushSync(() => setDirection(dir));
      html().classList.toggle("swup-theme-reverse", dir === "to-left");
      settle(html());
      html().classList.add("is-changing", "is-leaving", "is-animating");
      play("whoosh", dir === "to-left" ? -1 : 1);
      await wait(HALF_MS);
      covered.current = true;
      return true;
    } catch {
      clearClasses();
      return false;
    } finally {
      busy.current = false;
    }
  }, []);

  /** Swap the screen under the panel, then sweep the panel off. */
  const uncover = useCallback(async (swap: () => void) => {
    if (busy.current || !covered.current) return;
    busy.current = true;
    try {
      flushSync(swap);
      window.scrollTo(0, 0);
      html().classList.remove("is-leaving");
      settle(html());
      await wait(20);
      html().classList.remove("is-animating");
      html().classList.add("is-rendering");
      await wait(HALF_MS);
    } finally {
      clearClasses();
      covered.current = false;
      busy.current = false;
    }
  }, []);

  /** Cover, swap and uncover in one move. */
  const go = useCallback(
    async (dir: SweepDirection, swap: () => void) => {
      if (await cover(dir)) await uncover(swap);
    },
    [cover, uncover],
  );

  return { direction, go, cover, uncover };
}

/** The panel that sweeps across the page. Render once, outside the screens. */
export function TransitionOverlay({ direction }: { direction: SweepDirection }) {
  return <div className="swup-transition-overlay" data-direction={direction} aria-hidden="true" />;
}
