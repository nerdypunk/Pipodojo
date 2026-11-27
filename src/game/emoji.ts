const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;
const ANY_EMOJI = /\s?\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*️?/gu;

/** Free text without its emojis: "See you Saturday! 🍔" → "See you Saturday!". */
export function stripEmoji(text: string): string {
  return text.replace(ANY_EMOJI, "").trim();
}

/**
 * "👥 6 people" → { emoji: "👥", text: "6 people" }. No leading emoji → emoji is "". The leading
 * emoji is a key the screen turns into an icon; any other emojis in the text are dropped.
 */
export function splitEmoji(line: string): { emoji: string; text: string } {
  const emoji = LEADING_EMOJI.exec(line)?.[1] ?? "";
  return { emoji, text: stripEmoji(line.slice(emoji.length)) };
}
