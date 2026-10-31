// The prompt the player builds by tapping pieces. No typing, ever.
import type { Mission, Piece } from "./types.ts";

/** Picked pieces in slot order, then piece order (the order they appear in the prompt). */
export function pickedPieces(mission: Mission, picks: readonly string[]): Piece[] {
  return mission.slots.flatMap((slot) => slot.pieces.filter((p) => picks.includes(p.id)));
}

/** The written prompt the player's taps add up to. This is exactly what Pipo receives. */
export function buildPrompt(mission: Mission, picks: readonly string[]): string {
  return pickedPieces(mission, picks)
    .map((p) => p.text)
    .join(" ");
}

/** Tapping a piece: pick-one slots swap the choice, pick-many slots toggle it. */
export function togglePick(mission: Mission, picks: readonly string[], pieceId: string): string[] {
  const slot = mission.slots.find((s) => s.pieces.some((p) => p.id === pieceId));
  if (!slot) return [...picks];
  if (slot.pick === "many" || picks.includes(pieceId)) {
    return picks.includes(pieceId) ? picks.filter((p) => p !== pieceId) : [...picks, pieceId];
  }
  const siblings = new Set(slot.pieces.map((p) => p.id));
  return [...picks.filter((p) => !siblings.has(p)), pieceId];
}

/** Ready to check once every pick-one slot has a piece. */
export function isPromptReady(mission: Mission, picks: readonly string[]): boolean {
  return mission.slots.every((slot) => slot.pick === "many" || slot.pieces.some((p) => picks.includes(p.id)));
}

/** Pick-one slots still waiting for a piece. */
export function emptySlots(mission: Mission, picks: readonly string[]) {
  return mission.slots.filter((slot) => slot.pick === "one" && !slot.pieces.some((p) => picks.includes(p.id)));
}

/** Share of rows (0 to 1) that have at least one piece. Drives the progress bar. */
export function filledShare(mission: Mission, picks: readonly string[]): number {
  const filled = mission.slots.filter((slot) => slot.pieces.some((p) => picks.includes(p.id))).length;
  return filled / mission.slots.length;
}

export function weakPicks(mission: Mission, picks: readonly string[]): string[] {
  return pickedPieces(mission, picks)
    .filter((p) => p.quality === "weak")
    .map((p) => p.id);
}

/** Every required slot has a good piece. */
export function hasGoodGoal(mission: Mission, picks: readonly string[]): boolean {
  return mission.slots
    .filter((slot) => slot.required)
    .every((slot) => slot.pieces.some((p) => p.quality === "good" && picks.includes(p.id)));
}
