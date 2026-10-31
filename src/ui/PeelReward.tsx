// The path reward: a gift-wrapped card you peel open (peel.js) to reveal your badge and a
// postcard Muse Image painted from your own run, starring your Pipo. Save it or see it big.
// Drag the curled corner, or tap it to peel it all the way. Keyboard users and reduced motion
// get an "Open it" button that reveals the badge without peeling.
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { postcardFileName, type Postcard } from "../app/postcard.ts";
import { Peel, type PeelInstance } from "../vendor/peel/index.ts";
import { Pipo } from "./Pipo.tsx";
import { ShareSheet } from "./ShareSheet.tsx";
import { play } from "../app/sound.ts";
import { useLang } from "../i18n/index.tsx";

interface Props {
  pathName: string;
  lessons: number;
  /** Stars earned across the path. */
  stars: number;
  postcard: Postcard | null;
  /** For the share card: the path's brag line and the day streak. */
  share: { brag: string; streak: number };
}

/** How far the corner curls up before anyone touches it, to invite a peel. */
const TEASE = { x: 34, y: 26 };
const AUTO_PEEL_MS = 700;
/** Share of the wrapper peeled away after which it finishes coming off by itself. */
const PEEL_FINISH_AT = 0.45;
const PEEL_RELEASE_AT = 0.25;

export function PeelReward({ pathName, lessons, stars, postcard, share }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const peel = useRef<PeelInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [big, setBig] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const { t } = useLang();
  const r = t.reward;

  // Refs, not state, so the peel.js handlers (set up once) always see the latest values.
  const opened = useRef(false);
  const finishing = useRef(false);
  const pos = useRef<{ x: number; y: number } | null>(null);

  const reveal = () => {
    if (opened.current) return;
    opened.current = true;
    play("reveal");
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
    play("peel");
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
    if (!box || still || !Peel?.supported || opened.current) return;
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

  const ready = postcard?.status === "ready" ? postcard : null;

  // Sparkles when Muse Image's painting lands on an opened reward.
  const sparkled = useRef(false);
  useEffect(() => {
    if (!open || !ready?.painted || sparkled.current) return;
    sparkled.current = true;
    play("painted");
  }, [open, ready?.painted]);
  const seconds = ready?.ms !== undefined ? (ready.ms / 1000).toFixed(1) : null;

  return (
    <div className="space-y-2">
      <div
        ref={el}
        className={`peel relative h-56 w-full cursor-grab sm:h-44 rounded-2xl select-none ${still || !Peel?.supported ? "peel-ready" : ""}`}
        aria-label={open ? r.opened(pathName) : r.wrapped}
        role="img"
      >
        {/* The reward underneath: the postcard and the badge */}
        <div className="peel-bottom flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-100 via-white to-brand-100 p-3 ring-2 ring-amber-300">
          <div className="relative aspect-square h-24 shrink-0 overflow-hidden sm:h-full rounded-xl bg-brand-900 shadow-md ring-2 ring-white">
            {ready ? (
              <>
                <img src={ready.src} alt={r.postcardAlt} className="h-full w-full object-cover" />
                {ready.painted && <MetaChip label={r.chip} />}
              </>
            ) : postcard?.status === "painting" ? (
              <div className="postcard-painting flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                <span className="text-2xl" aria-hidden="true">🎨</span>
                <span className="text-[10px] leading-tight font-black text-white">⚡ {r.chip}</span>
                <span className="text-[10px] leading-tight font-bold text-white/85">{r.paintingThumb}</span>
                <LiveSeconds since={postcard.startedAt} />
              </div>
            ) : (
              <Pipo mood="happy" className="h-full w-full p-2" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-wider text-amber-700 uppercase">{r.badge}</p>
            <p className="text-lg leading-tight font-black text-ink sm:text-2xl">{r.pro(pathName)}</p>
            <p className="text-sm font-bold text-gray-700">
              {r.tally(lessons, stars, lessons * 3).lessons} · <span className="text-amber-500">★</span> {r.tally(lessons, stars, lessons * 3).stars}
            </p>
            <p className="text-xs font-semibold text-gray-600 sm:text-sm" aria-live="polite">
              {!postcard
                ? r.noPostcard
                : !ready
                  ? r.paintingPostcard
                  : ready.painted
                    ? r.painted(seconds ?? "…")
                    : r.fromPipo}
            </p>
          </div>
        </div>

        {/* The wrapping paper (front) */}
        {!open && (
          <div className="peel-top overflow-hidden rounded-2xl bg-[repeating-linear-gradient(45deg,#5a46e0_0_14px,#6e5cf2_14px_28px)]">
            <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-amber-300/90" aria-hidden="true" />
            <div className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 bg-amber-300/90" aria-hidden="true" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="rounded-full bg-white px-4 py-2 text-sm font-black text-brand-800 shadow-md">
                {r.peel}
              </p>
            </div>
          </div>
        )}
        {/* The back of the paper, seen while peeling */}
        {/* inline colour: peel.css sets its own default for .peel-back */}
        {!open && <div className="peel-back rounded-2xl" style={{ backgroundColor: "#e8e6ff" }} />}
      </div>

      {!open ? (
        <button
          type="button"
          onClick={still || !Peel?.supported ? reveal : finishPeel}
          className="text-sm font-extrabold text-brand-700 underline decoration-2 underline-offset-2 hover:text-brand-900"
        >
          {r.tapToOpen}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {/* The big moment: share the win */}
          <button
            type="button"
            onClick={() => setSharing(true)}
            className="pop-in flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(115deg,#ff7a1a,#ffb547)] py-3 text-base font-black text-white shadow-[0_10px_24px_-10px_rgb(255_122_26/0.8)] transition hover:brightness-105 active:translate-y-px"
          >
            <span aria-hidden="true">📣</span> {r.share}
          </button>
        {ready && (
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setBig(true)}
              className="text-sm font-extrabold text-brand-700 underline decoration-2 underline-offset-2 hover:text-brand-900"
            >
              {r.seeBig}
            </button>
            <a
              href={ready.src}
              download={postcardFileName(ready.src)}
              className="text-sm font-extrabold text-brand-700 underline decoration-2 underline-offset-2 hover:text-brand-900"
            >
              {r.save}
            </a>
          </div>
        )}
        </div>
      )}

      <ShareSheet
        open={sharing}
        painting={postcard?.status === "painting"}
        info={{ brag: share.brag, pathName, stars, maxStars: lessons * 3, lessons, streak: Math.max(1, share.streak), postcard: ready?.src ?? null, painted: !!ready?.painted }}
        onClose={() => setSharing(false)}
      />

      {/* On document.body: the lesson box is transformed, which would trap a fixed overlay inside it. */}
      {createPortal(
        <AnimatePresence>{big && ready && <BigPostcard postcard={ready} still={still} onClose={() => setBig(false)} />}</AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

/** "Meta Muse Image" on the postcard: which Meta model made this picture. */
function MetaChip({ label }: { label: string }) {
  return (
    <span className="absolute inset-x-1 bottom-1 rounded-lg bg-ink/80 px-1 py-0.5 text-center text-[9px] leading-tight font-black text-white backdrop-blur-sm">
      ⚡ {label}
    </span>
  );
}

/** Seconds since painting started, ticking, so it reads as live. */
function LiveSeconds({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);
  return <span className="font-mono text-[11px] font-bold text-white/80 tabular-nums">{((now - since) / 1000).toFixed(1)} s</span>;
}

/**
 * The postcard at full size over everything, with how it was made when Muse Image painted it:
 * the Meta model, how long it took, and the prompt Pipo wrote from the player's lessons.
 * Tap outside the details or press Escape to close.
 */
function BigPostcard({ postcard, still, onClose }: { postcard: Extract<Postcard, { status: "ready" }>; still: boolean; onClose: () => void }) {
  const { t } = useLang();
  const r = t.reward;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t.reward.yourPostcard}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10010] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-ink/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.img
        src={postcard.src}
        alt={r.postcardAlt}
        initial={still ? false : { scale: 0.9, rotate: -2 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
        className={`max-w-full rounded-2xl shadow-2xl ring-4 ring-white ${postcard.painted ? "max-h-[56dvh]" : "max-h-[80dvh]"}`}
      />
      {postcard.painted && (
        <div className="w-full max-w-md cursor-auto rounded-2xl bg-white/95 p-3 text-left shadow-xl" onClick={(e) => e.stopPropagation()}>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-ink">
            <span>🎨 {r.liveTitle}</span>
            {postcard.model && <code className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{postcard.model}</code>}
            {postcard.ms !== undefined && <span className="text-xs font-bold text-gray-500">{r.took((postcard.ms / 1000).toFixed(1))}</span>}
          </p>
          {postcard.scene && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs font-extrabold text-brand-700">{r.promptLabel}</summary>
              <p className="mt-1 max-h-28 overflow-y-auto rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs leading-snug font-semibold text-ink">{postcard.scene}</p>
            </details>
          )}
        </div>
      )}
      <button type="button" autoFocus className="rounded-full bg-white px-4 py-1.5 text-sm font-extrabold text-brand-700">
        {t.common.close}
      </button>
    </motion.div>
  );
}
