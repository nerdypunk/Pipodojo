// The day streak, like Duolingo's: how many days in a row you've finished a lesson. Kept on this
// device only. Pure: the caller passes today's date, so it's easy to test.

export interface Streak {
  /** Days in a row, counting the last day played. */
  days: number;
  /** The last day a lesson was finished, as YYYY-MM-DD in the player's own time zone. */
  last: string;
}

/** Today as YYYY-MM-DD in local time. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** The streak after finishing a lesson today. Same day: unchanged. Next day: +1. A gap: back to 1. */
export function playedOn(prev: Streak | null, today: string): Streak {
  if (!prev) return { days: 1, last: today };
  const gap = daysBetween(prev.last, today);
  if (gap === 0) return prev;
  if (gap === 1) return { days: prev.days + 1, last: today };
  return { days: 1, last: today };
}

/** The streak as shown today: still alive if you played today or yesterday, otherwise 0. */
export function currentDays(streak: Streak | null, today: string): number {
  if (!streak) return 0;
  const gap = daysBetween(streak.last, today);
  return gap <= 1 ? streak.days : 0;
}

/** Reads a stored streak, ignoring anything malformed. */
export function parseStreak(raw: unknown): Streak | null {
  const v = raw as Partial<Streak> | null;
  if (!v || typeof v.days !== "number" || v.days < 1 || typeof v.last !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.last)) return null;
  return { days: Math.floor(v.days), last: v.last };
}
