/** Joins class names, skipping empty ones. (shadcn's usual helper, without extra packages.) */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Japanese (and other CJK) characters, which can break onto a new line anywhere. */
const CJK = "\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef";
const PIECES = new RegExp(String.raw`[${CJK}][、。，．」』）！？ー]*|[^\s${CJK}]+\s*|\s+`, "g");

/**
 * Breaks text into lines no wider than `width` (as measured), for text drawn on a canvas. Breaks
 * at spaces, and between characters in Japanese, which has no spaces.
 */
export function wrapLines(text: string, width: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const piece of text.match(PIECES) ?? []) {
    const next = line + piece;
    if (line.trim() && measure(next.trimEnd()) > width) {
      lines.push(line.trimEnd());
      line = piece.trimStart();
    } else line = next;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
