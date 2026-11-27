import { Glyph } from "../Glyph.tsx";

/** A small gold medal for finished paths, with "×2" when there's more than one. */
export function MedalBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center text-amber-500" aria-hidden="true">
      <Glyph e="🏅" strokeWidth={2.5} />
      {count > 1 && <span className="text-[0.8em] font-black">×{count}</span>}
    </span>
  );
}
