// Rule-based scoring. Never asks a model to judge.
import { hasGoodGoal, weakPicks } from "./brief.ts";
import { FLAW_CONDITION } from "./schema.ts";
import type { Flaw, Mission, Score } from "./types.ts";

/** Does a flaw's `when` condition hold for the player's picks? */
export function conditionHolds(when: string, picks: readonly string[]): boolean {
  const match = FLAW_CONDITION.exec(when);
  if (!match) return false;
  const [, kind, ref] = match;
  return kind === "picked" ? picks.includes(ref!) : !picks.includes(ref!);
}

/** True if there are no signals, or the answer matches at least one (case-insensitive). */
export function signalsMatch(signals: readonly string[] | undefined, text: string): boolean {
  if (!signals?.length) return true;
  return signals.some((source) => new RegExp(source, "i").test(text));
}

/** Flaws the prompt has: something left out, or a weak piece that causes trouble. */
export function missedFlaws(mission: Mission, picks: readonly string[]): Flaw[] {
  return mission.flaws.filter((f) => conditionHolds(f.when, picks));
}

/**
 * Flaws that actually showed up in Pipo's answer. If Pipo happened to do fine
 * anyway, the flaw stays invisible and isn't held against the answer.
 */
export function visibleFlaws(mission: Mission, picks: readonly string[], answer: string): Flaw[] {
  return missedFlaws(mission, picks).filter((f) => signalsMatch(f.signals, answer));
}

/**
 * 3 stars: a clean prompt (good goal, nothing missing, nothing weak).
 * 2 stars: the prompt had gaps, but Pipo's answer came out fine.
 * 1 star:  a gap in the prompt showed up in Pipo's answer.
 */
export function evaluate(mission: Mission, picks: readonly string[], answer: string): Score {
  const weak = weakPicks(mission, picks);
  const missed = missedFlaws(mission, picks).map((f) => f.id);
  const visible = visibleFlaws(mission, picks, answer).map((f) => f.id);

  let stars: Score["stars"] = 3;
  if (weak.length || missed.length || !hasGoodGoal(mission, picks)) stars = 2;
  if (visible.length) stars = 1;

  return { stars, weakPicks: weak, missedFlaws: missed, visibleFlaws: visible };
}
