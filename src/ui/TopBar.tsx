import { useLang } from "../i18n/index.tsx";

interface Props {
  /** 0 to 1: how much of the prompt is built. */
  progress: number;
  /** Best stars earned on this lesson so far. */
  stars: number;
  /** Back to picking a path. */
  onBack: () => void;
  /** Where this lesson sits in its path. */
  lesson: { number: number; total: number };
}

/** Glass strip across the top: back, logo, lesson number, progress bar, stars. */
export function TopBar({ progress, stars, onBack, lesson }: Props) {
  const percent = Math.round(progress * 100);
  const { t } = useLang();
  return (
    <header className="glass flex items-center gap-3 rounded-2xl py-1.5 pr-4 pl-1.5 md:gap-4">
      <button
        type="button"
        onClick={onBack}
        aria-label={t.lesson.backToPaths}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl leading-none font-black text-brand-700 transition hover:bg-white/70 focus-visible:outline-3 focus-visible:outline-brand-500"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <span className="hidden text-lg font-black tracking-tight text-brand-700 sm:inline">Pipodojo</span>
      <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-white">
        {t.lesson.lessonOf(lesson.number, lesson.total)}
      </span>
      <div
        className="h-3 flex-1 overflow-hidden rounded-full bg-white/70"
        role="progressbar"
        aria-label={t.lesson.progress}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* Violet pill, same as the Check button, so the gold star stands out on the light glass */}
      <span
        className="flex items-center gap-1 rounded-full border border-brand-700 bg-brand-600 px-3 py-1 font-extrabold text-white shadow-sm"
        aria-label={t.lesson.starsLabel(stars)}
      >
        <span className="text-amber-300" aria-hidden="true">
          ★
        </span>
        {stars}
      </span>
    </header>
  );
}
