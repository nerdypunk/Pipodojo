// Nothing on screen shows an emoji: every emoji key in our lessons, paths, places and copy has a
// line icon of its own (not the sparkle fallback), and free text loses its emojis.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripEmoji } from "../src/game/emoji.ts";
import { hasIcon } from "../src/ui/Glyph.tsx";

const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*️?/gu;
// Flags are pairs of regional letters, not pictographs, so they never match.

function emojisIn(dir: string, ext: RegExp): Map<string, string> {
  const found = new Map<string, string>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [e, where] of emojisIn(path, ext)) found.set(e, where);
    } else if (ext.test(entry.name)) {
      for (const match of readFileSync(path, "utf8").matchAll(EMOJI)) found.set(match[0], path);
    }
  }
  return found;
}

describe("icons for emojis", () => {
  it("covers every emoji in the lessons", () => {
    const missing = [...emojisIn("missions", /\.json$/)].filter(([e]) => !hasIcon(e));
    expect(missing).toEqual([]);
  });

  it("covers every emoji key in paths, places and copy", () => {
    const missing = [...emojisIn("src/game", /\.ts$/), ...emojisIn("src/i18n", /\.ts$/)]
      // The 🏳️ fallback flag is text in the leaderboard, not an icon.
      .filter(([e]) => !e.startsWith("🏳") && !hasIcon(e));
    expect(missing).toEqual([]);
  });
});

describe("stripEmoji", () => {
  it("takes emojis out of free text", () => {
    expect(stripEmoji("See you Saturday! 🍔")).toBe("See you Saturday!");
    expect(stripEmoji("🎉 Party at 6 🙋‍♀️ bring snacks")).toBe("Party at 6 bring snacks");
    expect(stripEmoji("No emoji here")).toBe("No emoji here");
  });
});
