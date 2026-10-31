// Player-facing result copy. Friendly, plain, never blames the player.
import { signalsMatch } from "../engine/evaluator.ts";
import type { Mission, Score } from "../engine/types.ts";
import { splitEmoji } from "./emoji.ts";

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

export interface AnswerLine {
  emoji: string;
  text: string;
  /** The line shows a gap in the player's prompt (e.g. meat on a vegetarian menu). */
  flagged: boolean;
}

/** Pipo's answer as card lines. Gaps that point at specific lines get flagged. */
export function answerLines(mission: Mission, score: Score, answer: string): AnswerLine[] {
  const lines = plainAnswer(answer)
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter(Boolean);
  const flagged = new Set<number>();
  for (const flaw of mission.flaws.filter((f) => score.visibleFlaws.includes(f.id))) {
    const hits = lines.flatMap((line, i) => (signalsMatch(flaw.signals, line) ? [i] : []));
    // A signal that matches every line is about something missing, not a line to point at.
    if (hits.length < lines.length) hits.forEach((i) => flagged.add(i));
  }
  return lines.map((line, i) => ({ ...splitEmoji(line), flagged: flagged.has(i) }));
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
