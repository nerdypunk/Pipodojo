interface Props {
  /** 0 to 1: how much of the prompt is built. */
  progress: number;
  /** Best stars earned on this lesson so far. */
  stars: number;
}

/** Game frame across the top: logo, progress bar, stars. */
export function TopBar({ progress, stars }: Props) {
  const percent = Math.round(progress * 100);
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 md:px-8 md:py-5">
      <span className="text-xl font-black tracking-tight text-go md:text-2xl">Pipodojo</span>
      <div
        className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-label="Prompt progress"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-go transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="flex items-center gap-1 text-lg font-extrabold text-amber-500" aria-label={`${stars} stars`}>
        <span aria-hidden="true">★</span>
        {stars}
      </span>
    </header>
  );
}
