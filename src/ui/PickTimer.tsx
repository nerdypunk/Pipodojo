// The quick pick ring for Pick a prompt: a circle that counts down from 30. Picking in time turns
// it into a small "Quick pick!" badge. With 10 seconds still on the ring it calmly gives way to
// "Take your time" rather than racing to zero, and the player can still pick and play as usual.
// The clock pauses while the tab is hidden.
import { useEffect, useState } from "react";
import { useLang } from "../i18n/index.tsx";

/** What the ring starts at. */
export const PICK_SECONDS = 30;
/** Seconds left on the ring when it gives way to "Take your time". */
const CALM_SECONDS = 10;
/** How long a pick still counts as quick. */
export const QUICK_SECONDS = PICK_SECONDS - CALM_SECONDS;
const TICK_MS = 200;

/** Seconds that have passed while `running` (up to `limit`), counting only time the page was visible. */
export function useCountdown(running: boolean, limit = QUICK_SECONDS) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      if (!document.hidden) setElapsed((e) => Math.min(limit, e + (now - last) / 1000));
      last = now;
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, limit]);
  return elapsed;
}

const R = 15;
const AROUND = 2 * Math.PI * R;

interface Props {
  elapsed: number;
  /** Seconds the player took, once they picked in time. */
  quick: number | null;
}

export function PickTimer({ elapsed, quick }: Props) {
  const { t } = useLang();
  const left = Math.max(0, Math.ceil(PICK_SECONDS - elapsed));

  if (quick !== null || elapsed >= QUICK_SECONDS) {
    return (
      <p
        role="status"
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black whitespace-nowrap ${
          quick !== null ? "bg-brand-600 text-white" : "bg-white/80 text-gray-600 ring-1 ring-white"
        }`}
      >
        {quick !== null ? t.lesson.quickPick(quick) : t.lesson.timeUp}
      </p>
    );
  }

  return (
    <div className="relative h-11 w-11 shrink-0" role="img" aria-label={t.lesson.pickTimer(QUICK_SECONDS)}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={R} fill="white" fillOpacity={0.8} stroke="var(--color-brand-100)" strokeWidth={4} />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke="var(--color-brand-600)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={AROUND}
          strokeDashoffset={AROUND * (elapsed / PICK_SECONDS)}
          className="transition-[stroke-dashoffset] duration-200 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-sm font-black text-brand-700 tabular-nums"
      >
        {left}
      </span>
    </div>
  );
}
