// The key ways to build a lesson's prompt: the best one, and one variant per flaw (leave out a
// good piece, or swap in a weak one). Used by the live check script and the "Which prompt wins?" game.
import { togglePick } from "./brief.ts";
import type { Mission } from "./types.ts";

/** Every good piece (the first good one in pick-one rows). */
export function bestPicks(mission: Mission): string[] {
  return mission.slots.flatMap((slot) => {
    const good = slot.pieces.filter((p) => p.quality === "good");
    if (slot.pick === "many") return good.map((p) => p.id);
    return [(good[0] ?? slot.pieces.find((p) => p.quality === "neutral") ?? slot.pieces[0]!).id];
  });
}

/** The best prompt, plus one variant per flaw, keyed by "best" and the flaw's id. */
export function keySetups(mission: Mission): Record<string, string[]> {
  const best = bestPicks(mission);
  const setups: Record<string, string[]> = { best };
  for (const flaw of mission.flaws) {
    const [kind, ref] = flaw.when.split(":") as [string, string];
    setups[flaw.id] = kind === "not_picked" ? best.filter((id) => id !== ref) : togglePick(mission, best, ref);
  }
  return setups;
}
