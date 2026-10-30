// Player-facing result copy. Friendly, plain, never blames the player.
import type { Mission, RunLog, Score } from "../engine/types.ts";

export function resultHeadline(stars: Score["stars"]): string {
  return ["Oops, that one got through.", "Safe call!", "Nice work!", "Perfect training!"][stars]!;
}

function labels(mission: Mission, ids: readonly string[]): string {
  const names = ids.map((id) => mission.tools.find((t) => t.id === id)?.label ?? id);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Short lines for the "What just happened" card, most important first. */
export function resultNotes(mission: Mission, log: RunLog): string[] {
  const { score, gateDecision: decision } = log;
  const flaws = mission.gate.flaws.filter((f) => score.activeFlaws.includes(f.id));
  const notes: string[] = [];

  if (decision.type === "fix") {
    const fix = mission.gate.fixes.find((f) => f.id === decision.fixId);
    if (fix) notes.push(fix.result);
  } else if (flaws.length && decision.type === "stop") {
    notes.push("Good catch. You stopped it before it went out.");
  } else if (flaws.length) {
    notes.push("It went out with a problem.");
  } else if (decision.type === "approve") {
    notes.push("The draft was fine, so approving was the right call.");
  }
  if (!flaws.length && decision.type !== "approve") {
    notes.push("This draft was actually fine, so approving would have been OK too.");
  }

  for (const flaw of flaws) notes.push(flaw.explain);

  if (score.missingRequired.length) {
    notes.push(`Pipo didn't have ${labels(mission, score.missingRequired)}. Try equipping it next time.`);
  }
  if (!score.checks.goodGoal) notes.push("A more specific goal helps Pipo focus.");
  if (score.trapsEquipped.length) {
    notes.push(`${labels(mission, score.trapsEquipped)} gave Pipo more power than this job needed.`);
  }
  return notes;
}
