interface Props {
  /** 0 to 1: how much of the prompt is built. */
  progress: number;
  /** Best stars earned on this lesson so far. */
  stars: number;
  /** Back to picking a path. */
  onBack: () => void;
}

/** Glass strip across the top: back, logo, progress bar, stars. */
export function TopBar({ progress, stars, onBack }: Props) {
  const percent = Math.round(progress * 100);
  return (
    <header className="glass flex items-center gap-3 rounded-2xl py-1.5 pr-4 pl-1.5 md:gap-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to paths"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl leading-none font-black text-brand-700 transition hover:bg-white/70 focus-visible:outline-3 focus-visible:outline-brand-500"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <span className="text-lg font-black tracking-tight text-brand-700">Pipodojo</span>
      <div
        className="h-3 flex-1 overflow-hidden rounded-full bg-white/70"
        role="progressbar"
        aria-label="Prompt progress"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="flex items-center gap-1 font-extrabold text-amber-500" aria-label={`${stars} stars`}>
        <span aria-hidden="true">★</span>
        {stars}
      </span>
    </header>
  );
}
