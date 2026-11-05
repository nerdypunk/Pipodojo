// The key ways to build a lesson's prompt: the best one, and one variant per flaw (leave out a
// good piece, or swap in a weak one). Used by the live check script, the "Which prompt wins?" game
// and "Pick a prompt".
import { buildPrompt, isPromptReady, togglePick, weakPicks } from "./brief.ts";
import { missedFlaws } from "./evaluator.ts";
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

/** How far apart in length the two messages in "Pick a prompt" may be, as a share of the longer one. */
export const PAIR_CLOSE = 0.12;

/** One way to show "Pick a prompt": a message with nothing missing and a weaker one. */
export interface PromptOption {
  best: string[];
  weak: string[];
  /** (best length - weak length) / the longer length: above 0 when the best one is longer. */
  gap: number;
}

/**
 * Every pairing for "Pick a prompt". Leaving facts out makes a message shorter, so on its own the
 * better message was nearly always the longer one, and length gave the answer away. So the best
 * message may also carry harmless extra pieces (neutral ones), and the weaker one may carry extras
 * too (neutral, or fluff like "Make it super fancy!", which weak messages often have).
 */
export function promptOptions(mission: Mission): PromptOption[] {
  const extras = (keep: (q: string) => boolean) =>
    subsets(mission.slots.filter((s) => s.pick === "many").flatMap((s) => s.pieces.filter((p) => keep(p.quality)).map((p) => p.id)));
  const best = bestPicks(mission);
  const bests = extras((q) => q === "neutral")
    .map((more) => [...best, ...more.filter((id) => !best.includes(id))])
    .filter((picks) => missedFlaws(mission, picks).length === 0 && weakPicks(mission, picks).length === 0);
  const weaks = weakerPrompts(mission)
    .flatMap((weak) => extras((q) => q !== "good").map((more) => [...weak, ...more.filter((id) => !weak.includes(id))]))
    .filter((picks) => isPromptReady(mission, picks));
  const length = (picks: string[]) => buildPrompt(mission, picks).length;
  return bests.flatMap((b) =>
    weaks.map((w) => ({ best: b, weak: w, gap: (length(b) - length(w)) / Math.max(1, length(b), length(w)) })),
  );
}

/**
 * "Pick a prompt": a best message and a weaker one, close in length, in a random order. When
 * pairings of both kinds are close enough, a coin decides whether the better one is the longer.
 */
export function promptPair(mission: Mission, random: () => number = Math.random): [string[], string[]] {
  const options = promptOptions(mission);
  if (!options.length) {
    const best = bestPicks(mission);
    return [best, weakerPrompts(mission)[0] ?? best];
  }
  const close = options.filter((o) => Math.abs(o.gap) <= PAIR_CLOSE);
  let pool = close.length ? close : [options.reduce((a, o) => (Math.abs(o.gap) < Math.abs(a.gap) ? o : a))];
  const longer = pool.filter((o) => o.gap > 0);
  const shorter = pool.filter((o) => o.gap <= 0);
  if (longer.length && shorter.length) pool = random() < 0.5 ? longer : shorter;
  const { best, weak } = pool[Math.floor(random() * pool.length)]!;
  return random() < 0.5 ? [best, weak] : [weak, best];
}

function subsets<T>(items: readonly T[]): T[][] {
  return items.reduce<T[][]>((all, item) => all.concat(all.map((set) => [...set, item])), [[]]);
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}
