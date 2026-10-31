// The path reward: a gift-wrapped card you peel open (peel.js) to reveal your badge.
// Drag the curled corner, or tap it to peel it all the way. Keyboard users and reduced motion
// get an "Open it" button that reveals the badge without peeling.
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import { Peel, type PeelInstance } from "../vendor/peel/index.ts";
import { Pipo } from "./Pipo.tsx";

interface Props {
  pathName: string;
  lessons: number;
  /** Stars earned across the path. */
  stars: number;
}

/** How far the corner curls up before anyone touches it, to invite a peel. */
const TEASE = { x: 34, y: 26 };
const AUTO_PEEL_MS = 700;
/** Share of the wrapper peeled away after which it finishes coming off by itself. */
const PEEL_FINISH_AT = 0.45;
const PEEL_RELEASE_AT = 0.25;

export function PeelReward({ pathName, lessons, stars }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const peel = useRef<PeelInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Refs, not state, so the peel.js handlers (set up once) always see the latest values.
  const opened = useRef(false);
  const finishing = useRef(false);
  const pos = useRef<{ x: number; y: number } | null>(null);

  const reveal = () => {
    if (opened.current) return;
    opened.current = true;
    setOpen(true);
    void confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.55 },
      colors: ["#6e5cf2", "#8c7dfb", "#9cc2ff", "#fbbf24", "#ff7a1a"],
      disableForReducedMotion: true,
    });
  };

  // Carry the peel the rest of the way, from wherever it is, then reveal.
  const finishPeel = () => {
    const box = el.current;
    const p = peel.current;
    if (!box || !p) return reveal();
    if (finishing.current) return;
    finishing.current = true;
    const { width: w, height: h } = box.getBoundingClientRect();
    const from = pos.current ?? { x: w - TEASE.x, y: h - TEASE.y };
    const to = { x: -w * 1.2, y: -h * 1.2 };
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / AUTO_PEEL_MS);
      const ease = 1 - (1 - t) ** 3;
      p.setPeelPosition(from.x + (to.x - from.x) * ease, from.y + (to.y - from.y) * ease);
      if (t < 1) requestAnimationFrame(step);
      else reveal();
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    const box = el.current;
    if (!box || still || !Peel?.supported) return;
    const p = new Peel(box, { corner: Peel.Corners.BOTTOM_RIGHT, backReflection: true, backReflectionAlpha: 0.2 });
    peel.current = p;
    const { width: w, height: h } = box.getBoundingClientRect();
    p.setPeelPosition(w - TEASE.x, h - TEASE.y);
    p.setFadeThreshold(0.85);

    // peel.js measures from the offset parent, which is wrong inside our positioned dialog;
    // measure from the card's own position on screen instead.
    p.handleDrag(function (evt) {
      if (finishing.current) return;
      const r = box.getBoundingClientRect();
      const point = "touches" in evt ? (evt.touches[0] ?? evt.changedTouches[0]) : evt;
      if (!point) return;
      pos.current = { x: point.clientX - r.left, y: point.clientY - r.top };
      this.setPeelPosition(pos.current.x, pos.current.y);
      // Past about half, the paper comes off by itself.
      if (this.getAmountClipped() > PEEL_FINISH_AT) finishPeel();
    });
    p.handlePress(() => finishPeel());

    // Letting go after a decent peel also finishes it.
    const release = () => {
      if (!opened.current && !finishing.current && pos.current && p.getAmountClipped() > PEEL_RELEASE_AT) finishPeel();
    };
    document.addEventListener("mouseup", release);
    document.addEventListener("touchend", release);

    return () => {
      p.removeEvents();
      document.removeEventListener("mouseup", release);
      document.removeEventListener("touchend", release);
      peel.current = null;
    };
  }, [still]);

  return (
    <div className="space-y-2">
      <div
        ref={el}
        className={`peel relative h-40 w-full cursor-grab rounded-2xl select-none ${still || !Peel?.supported ? "peel-ready" : ""}`}
        aria-label={open ? `${pathName} Pro badge` : "A wrapped reward. Peel the corner to open it."}
        role="img"
      >
        {/* The reward underneath */}
        <div className="peel-bottom flex items-center gap-4 rounded-2xl bg-gradient-to-br from-amber-100 via-white to-brand-100 px-5 ring-2 ring-amber-300">
          <Pipo mood="happy" className="h-20 w-20 shrink-0 drop-shadow-[0_6px_12px_rgb(45_36_112/0.3)]" />
          <div>
            <p className="text-xs font-black tracking-wider text-amber-700 uppercase">Badge unlocked</p>
            <p className="text-2xl leading-tight font-black text-ink">🏅 {pathName} Pro</p>
            <p className="text-sm font-bold text-gray-700">
              {lessons} lessons · <span className="text-amber-500">★</span> {stars} of {lessons * 3} stars
            </p>
            <p className="text-sm font-semibold text-gray-600">You can hand everyday chores to an agent now.</p>
          </div>
        </div>

        {/* The wrapping paper (front) */}
        {!open && (
          <div className="peel-top overflow-hidden rounded-2xl bg-[repeating-linear-gradient(45deg,#5a46e0_0_14px,#6e5cf2_14px_28px)]">
            <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-amber-300/90" aria-hidden="true" />
            <div className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 bg-amber-300/90" aria-hidden="true" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="rounded-full bg-white px-4 py-2 text-sm font-black text-brand-800 shadow-md">
                🎁 Peel the corner to open your reward
              </p>
            </div>
          </div>
        )}
        {/* The back of the paper, seen while peeling */}
        {/* inline colour: peel.css sets its own default for .peel-back */}
        {!open && <div className="peel-back rounded-2xl" style={{ backgroundColor: "#e8e6ff" }} />}
      </div>

      {!open && (
        <button
          type="button"
          onClick={still || !Peel?.supported ? reveal : finishPeel}
          className="text-sm font-extrabold text-brand-700 underline decoration-2 underline-offset-2 hover:text-brand-900"
        >
          Or tap here to open it
        </button>
      )}
    </div>
  );
}
