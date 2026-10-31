// Player-facing result copy. Friendly, plain, never blames the player.
import type { Mission, Score } from "../engine/types.ts";

export function resultHeadline(stars: Score["stars"]): string {
  return { 1: "Pipo missed something", 2: "Nice! Pipo did well", 3: "Perfect prompt!" }[stars];
}

/** Short lines for the result card, most important first. */
export function resultNotes(mission: Mission, score: Score): string[] {
  const notes: string[] = [];
  for (const flaw of mission.flaws) {
    if (score.visibleFlaws.includes(flaw.id)) notes.push(flaw.explain);
    else if (score.missedFlaws.includes(flaw.id)) notes.push(flaw.hint);
  }
  for (const piece of mission.slots.flatMap((s) => s.pieces)) {
    if (score.weakPicks.includes(piece.id) && piece.tip) notes.push(piece.tip);
  }
  if (score.stars === 3) notes.push("Your prompt had everything Pipo needed.");
  return notes;
}

/** Light cleanup so a model's markdown reads as plain text on the card. */
export function plainAnswer(answer: string): string {
  return answer
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .trim();
}
