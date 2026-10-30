// The brief: the prompt the player builds by tapping options. No typing, ever.
import type { BriefOption, Mission } from "./types.ts";

/** Picked options in slot order, then option order (the order they appear in the prompt). */
export function pickedOptions(mission: Mission, picks: readonly string[]): BriefOption[] {
  return mission.brief.flatMap((slot) => slot.options.filter((o) => picks.includes(o.id)));
}

/** The written prompt the player's taps add up to. This is exactly what the model receives. */
export function buildPrompt(mission: Mission, picks: readonly string[]): string {
  return pickedOptions(mission, picks)
    .map((o) => o.text)
    .join(" ");
}

/** Tapping an option: pick-one slots swap the choice, pick-many slots toggle it. */
export function togglePick(mission: Mission, picks: readonly string[], optionId: string): string[] {
  const slot = mission.brief.find((s) => s.options.some((o) => o.id === optionId));
  if (!slot) return [...picks];
  if (slot.pick === "many") {
    return picks.includes(optionId) ? picks.filter((p) => p !== optionId) : [...picks, optionId];
  }
  const siblings = new Set(slot.options.map((o) => o.id));
  return [...picks.filter((p) => !siblings.has(p)), optionId];
}

/** Ready to run once every pick-one slot has a choice. */
export function isBriefReady(mission: Mission, picks: readonly string[]): boolean {
  return mission.brief.every((slot) => slot.pick === "many" || slot.options.some((o) => picks.includes(o.id)));
}

export function poorPicks(mission: Mission, picks: readonly string[]): string[] {
  return pickedOptions(mission, picks)
    .filter((o) => o.quality === "poor")
    .map((o) => o.id);
}

/** A good brief: no poor option picked, and every required slot has a good option. */
export function isGoodBrief(mission: Mission, picks: readonly string[]): boolean {
  if (poorPicks(mission, picks).length) return false;
  return mission.brief
    .filter((slot) => slot.required)
    .every((slot) => slot.options.some((o) => o.quality === "good" && picks.includes(o.id)));
}
