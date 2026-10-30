// Rule-based scoring (SPEC sections 8 and 9). Never asks a model to judge.
import { isGoodBrief, poorPicks } from "./brief.ts";
import { FLAW_CONDITION } from "./schema.ts";
import type { Draft, Flaw, GateDecision, Mission, Score, Setup } from "./types.ts";

/** Does a flaw's `when` condition hold for the player's setup? */
export function conditionHolds(when: string, setup: Setup): boolean {
  const match = FLAW_CONDITION.exec(when);
  if (!match) return false;
  const [, kind, ref] = match;
  if (kind === "tool_missing") return !setup.equipped.includes(ref!);
  if (kind === "picked") return setup.picks.includes(ref!);
  if (kind === "not_picked") return !setup.picks.includes(ref!);
  return false;
}

/** True if there are no signals, or the draft matches at least one (case-insensitive). */
export function signalsMatch(signals: readonly string[] | undefined, text: string): boolean {
  if (!signals?.length) return true;
  return signals.some((source) => new RegExp(source, "i").test(text));
}

/**
 * A flaw is active when its condition holds for the setup AND (if it has signals)
 * the draft matches one. A safe draft is scored as safe even in a weak setup.
 */
export function activeFlaws(mission: Mission, setup: Setup, draft: Draft | null): Flaw[] {
  return mission.gate.flaws.filter(
    (flaw) => conditionHolds(flaw.when, setup) && signalsMatch(flaw.signals, draft?.text ?? ""),
  );
}

/** Does this decision let the draft go out unchanged? Approve and incorrect fixes do. */
export function letsDraftThrough(mission: Mission, decision: GateDecision): boolean {
  if (decision.type === "approve") return true;
  if (decision.type === "stop") return false;
  return !mission.gate.fixes.find((f) => f.id === decision.fixId)?.correct;
}

/** No active flaw: Approve is correct. Any active flaw: Stop or a correct fix is correct. */
export function isCorrectDecision(mission: Mission, flaws: readonly Flaw[], decision: GateDecision): boolean {
  if (flaws.length === 0) return decision.type === "approve";
  return !letsDraftThrough(mission, decision);
}

export function evaluate(mission: Mission, setup: Setup, draft: Draft | null, decision: GateDecision): Score {
  const flaws = activeFlaws(mission, setup, draft);
  const missingRequired = mission.tools
    .filter((t) => t.role === "required" && !setup.equipped.includes(t.id))
    .map((t) => t.id);
  const trapsEquipped = mission.tools
    .filter((t) => t.role === "trap" && setup.equipped.includes(t.id))
    .map((t) => t.id);

  const checks = {
    safeOutcome: !(flaws.length > 0 && letsDraftThrough(mission, decision)),
    requiredTools: missingRequired.length === 0,
    goodBrief: isGoodBrief(mission, setup.picks),
    correctDecision: isCorrectDecision(mission, flaws, decision),
    noTrap: trapsEquipped.length === 0,
  };

  let stars: Score["stars"] = 0;
  if (checks.safeOutcome) {
    stars = 1;
    if (checks.requiredTools && checks.goodBrief) {
      stars = 2;
      if (checks.correctDecision && checks.noTrap) stars = 3;
    }
  }

  return {
    stars,
    checks,
    activeFlaws: flaws.map((f) => f.id),
    missingRequired,
    trapsEquipped,
    poorPicks: poorPicks(mission, setup.picks),
  };
}
