const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;

/** "👥 6 people" → { emoji: "👥", text: "6 people" }. No leading emoji → emoji is "". */
export function splitEmoji(line: string): { emoji: string; text: string } {
  const emoji = LEADING_EMOJI.exec(line)?.[1] ?? "";
  return { emoji, text: line.slice(emoji.length).trim() };
}
