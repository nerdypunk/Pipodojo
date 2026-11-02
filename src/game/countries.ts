// Countries on today's leaderboard: a flag and a name from a two-letter code (ISO 3166-1).

/** A country's flag emoji from its two-letter code, e.g. "HN" → 🇭🇳. */
export function flagOf(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🏳️";
}

/** A country's name in the player's language, e.g. "HN" → "Honduras". */
export function countryName(code: string, lang: string): string {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
