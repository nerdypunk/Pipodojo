// A quick first-time tour of the lesson screen: it dims the page and spotlights one part at a
// time (the situation, where the message is built, then the message and Check), with a short
// card beside it. Shown once, on whichever lesson a player opens first; remembered on the device.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useLang } from "../i18n/index.tsx";
import { Button } from "./Button.tsx";

const KEY = "pipodojo.tutorial";
/** Space between the spotlight and what it lights, and between the card and the screen edge. */
const PAD = 8;
const EDGE = 12;
const GAP = 14;

/** True until the player has seen (or skipped) the tour on this device. */
export function tutorialPending(): boolean {
  try {
    return localStorage.getItem(KEY) !== "done";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(KEY, "done");
  } catch {
    // Shown again next time, which is fine.
  }
}

export interface TourStep {
  target: RefObject<HTMLElement | null>;
  title: string;
  text: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where the card goes: beside the spotlight if there's room, else below, else above, else at the bottom. */
function placeCard(spot: Box, card: { width: number; height: number }, view: { width: number; height: number }) {
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), view.width - card.width - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), view.height - card.height - EDGE);
  const middleY = clampY(spot.top + spot.height / 2 - card.height / 2);
  if (spot.left + spot.width + GAP + card.width + EDGE <= view.width) return { left: spot.left + spot.width + GAP, top: middleY };
  if (spot.left - GAP - card.width >= EDGE) return { left: spot.left - GAP - card.width, top: middleY };
  const centeredX = clampX(spot.left + spot.width / 2 - card.width / 2);
  if (spot.top + spot.height + GAP + card.height + EDGE <= view.height) return { left: centeredX, top: spot.top + spot.height + GAP };
  if (spot.top - GAP - card.height >= EDGE) return { left: centeredX, top: spot.top - GAP - card.height };
  return { left: clampX((view.width - card.width) / 2), top: view.height - card.height - EDGE };
}

export function LessonTutorial({ steps, onDone }: { steps: readonly TourStep[]; onDone: () => void }) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Box | null>(null);
  const [cardAt, setCardAt] = useState<{ left: number; top: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const step = steps[index]!;
  const last = index === steps.length - 1;

  const finish = useCallback(() => {
    markSeen();
    onDone();
  }, [onDone]);

  // Measure the spotlit part (and fit the card around it); again whenever the page moves.
  const measure = useCallback(() => {
    const el = step.target.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const box = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
    setSpot(box);
    const c = card.current;
    if (c) setCardAt(placeCard(box, { width: c.offsetWidth, height: c.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
  }, [step]);

  useLayoutEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    step.target.current?.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
    measure();
    // A smooth scroll takes a moment: measure again once it has settled.
    const later = window.setTimeout(measure, still ? 0 : 450);
    // Keyboard focus on the main button (Next / Let's go), the last button in the card.
    const buttons = card.current?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[buttons.length - 1]?.focus();
    return () => window.clearTimeout(later);
  }, [step, measure]);

  useEffect(() => {
    const onMove = () => requestAnimationFrame(measure);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [measure, finish]);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t.tutorial.label}>
      {/* Catches taps on the page behind while the tour is open. */}
      <div className="absolute inset-0" />
      {spot && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[28px] ring-4 ring-amber-300 transition-all duration-300 motion-reduce:transition-none"
          style={{ ...spot, boxShadow: "0 0 0 9999px rgb(20 14 60 / 0.62)" }}
        />
      )}
      <div
        ref={card}
        className="pop-in absolute w-[min(20rem,calc(100vw-1.5rem))] rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-brand-100"
        style={cardAt ?? { left: EDGE, bottom: EDGE, visibility: spot ? "visible" : "hidden" }}
      >
        <p className="text-xs font-black tracking-wide text-brand-600 uppercase">{t.tutorial.stepOf(index + 1, steps.length)}</p>
        <h2 className="mt-0.5 text-lg leading-tight font-black text-ink">{step.title}</h2>
        <p className="mt-1 text-[15px] leading-snug font-semibold text-gray-600">{step.text}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          {last ? (
            <span />
          ) : (
            <button type="button" onClick={finish} className="rounded-xl px-2 py-1.5 text-sm font-extrabold text-gray-500 hover:bg-brand-50 hover:text-brand-700">
              {t.tutorial.skip}
            </button>
          )}
          <Button className="w-32" onClick={() => (last ? finish() : setIndex(index + 1))}>
            {last ? t.tutorial.done : t.tutorial.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
