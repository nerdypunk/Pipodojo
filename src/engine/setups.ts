// The key ways to build a lesson's prompt: the best one, and one variant per flaw (leave out a
// good piece, or swap in a weak one). Used by the live check script, the "Which prompt wins?" game
// and "Pick a prompt".
import { isPromptReady, togglePick } from "./brief.ts";
import type { Mission } from "./types.ts";

/** Every good piece (the first good one in pick-one rows). */
export function bestPicks(mission: Mission): string[] {
  return mission.slots.flatMap((slot) => {
    const good = slot.pieces.filter((p) => p.quality === "good");
    if (slot.pick === "many") return good.map((p) => p.id);
    return [(good[0] ?? slot.pieces.find((p) => p.quality === "neutral") ?? slot.pieces[0]!).id];
  });
}

/** Makes one flaw happen in a set of picks: leave its good piece out, or swap its weak piece in. */
function withFlaw(mission: Mission, picks: string[], flaw: Mission["flaws"][number]): string[] {
  const [kind, ref] = flaw.when.split(":") as [string, string];
  if (kind === "not_picked") return picks.filter((id) => id !== ref);
  return picks.includes(ref) ? picks : togglePick(mission, picks, ref);
}

/** The best prompt, plus one variant per flaw, keyed by "best" and the flaw's id. */
export function keySetups(mission: Mission): Record<string, string[]> {
  const best = bestPicks(mission);
  const setups: Record<string, string[]> = { best };
  for (const flaw of mission.flaws) setups[flaw.id] = withFlaw(mission, best, flaw);
  return setups;
}

/** The best prompt with several flaws at once (by id), e.g. vague and missing a key fact. */
export function flawedPicks(mission: Mission, flawIds: readonly string[]): string[] {
  return mission.flaws.filter((f) => flawIds.includes(f.id)).reduce((picks, flaw) => withFlaw(mission, picks, flaw), bestPicks(mission));
}

/** How many flaws the weaker message in "Pick a prompt" has: easy to spot, still believable. */
export const FLAWS_IN_WEAK = 2;

/**
 * Every weaker message for "Pick a prompt": the best one with FLAWS_IN_WEAK flaws at once, kept
 * only if it could still be sent (no required row left empty) and really differs from the best.
 * Falls back to single flaws for lessons where no pair of flaws works.
 */
export function weakerPrompts(mission: Mission): string[][] {
  const best = bestPicks(mission);
  const usable = (picks: string[]) => isPromptReady(mission, picks) && !sameSet(picks, best);
  const ids = mission.flaws.map((f) => f.id);
  const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => flawedPicks(mission, [a, b])));
  const ok = pairs.filter(usable);
  return ok.length ? ok : ids.map((id) => flawedPicks(mission, [id])).filter(usable);
}

/** "Pick a prompt": the best message and a weaker one, picked at random, in a random order. */
export function promptPair(mission: Mission, random: () => number = Math.random): [string[], string[]] {
  const best = bestPicks(mission);
  const options = weakerPrompts(mission);
  const weak = options[Math.floor(random() * options.length)] ?? best;
  return random() < 0.5 ? [best, weak] : [weak, best];
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}
