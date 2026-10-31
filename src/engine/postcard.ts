// The end-of-path postcard: one picture scene built from what Pipo really did in each lesson
// of the path (the menu it planned, the invite it sent, the food it bought) and the player's
// own Pipo look. One image per finished path keeps it cheap.
import type { Mission, RunLog } from "./types.ts";

/** Matches the image endpoint's cap (functions/api/image.js). */
export const MAX_SCENE_CHARS = 700;
const MAX_PART_CHARS = 170;

/** Plain words for a picture: names only, no prices, emoji or markdown. */
function plain(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(plain).filter(Boolean).join(", ");
  if (typeof value === "object") return plain((value as { name?: unknown }).name);
  return String(value)
    .replace(/[*_#•]/g, " ")
    .replace(/\p{Extended_Pictographic}|️/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/[\s,;:]+\S*$/, "")}…`;
}

/** One lesson's part, from its postcard template and the run. Empty if the lesson has none. */
export function postcardPart(mission: Mission, log: RunLog): string {
  if (!mission.postcard) return "";
  const args: Record<string, unknown> = { ...log.action?.args };
  return mission.postcard.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = key === "answer" ? plain(log.answer.split("\n").join(", ")) : plain(args[key]);
    return clip(value || "good things", MAX_PART_CHARS);
  });
}

/** The full scene sent to the painter. `look` is the player's Pipo in plain words. */
export function postcardScene(look: string, runs: readonly { mission: Mission; log: RunLog }[]): string {
  const parts = runs.map(({ mission, log }) => postcardPart(mission, log)).filter(Boolean);
  const scene = `Starring ${look}. ${parts.length ? `One happy scene that shows ${joinAnd(parts)}.` : ""}`;
  return clip(scene.trim(), MAX_SCENE_CHARS);
}

function joinAnd(parts: string[]): string {
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join("; ")}; and ${parts.at(-1)}`;
}
