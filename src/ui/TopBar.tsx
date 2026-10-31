interface Props {
  /** 0 to 1: how much of the prompt is built. */
  progress: number;
  /** Best stars earned on this lesson so far. */
  stars: number;
}

/** Glass strip across the top: logo, progress bar, stars. */
export function TopBar({ progress, stars }: Props) {
  const percent = Math.round(progress * 100);
  return (
    <header className="glass flex items-center gap-4 rounded-2xl px-4 py-2.5">
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
