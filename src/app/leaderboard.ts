// Today's leaderboard on the client: hand in a finished lesson's stars, and read the board.
// Countries only: no names, no accounts, no cookies. This device remembers which lessons it
// already counted today (in its own storage), so replaying a lesson doesn't count it twice.
import { takeReceipt } from "./liveClient.ts";

export interface CountryRow {
  country: string;
  stars: number;
  lessons: number;
}

export interface Leaderboard {
  day: string;
  /** Today's countries by stars. */
  countries: CountryRow[];
  /** Every day added up. */
  allTime: CountryRow[];
  /** The player's own country, or null if it isn't known. */
  you: string | null;
}

const KEY = "pipodojo.counted";

/** The leaderboard's day, matching the server: the UTC date. */
export const todayUtc = (now = new Date()) => now.toISOString().slice(0, 10);

function countedToday(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { day?: string; ids?: string[] } | null;
    return saved?.day === todayUtc() && Array.isArray(saved.ids) ? saved.ids : [];
  } catch {
    return [];
  }
}

function markCounted(missionId: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: todayUtc(), ids: [...countedToday(), missionId] }));
  } catch {
    // Not remembered this time.
  }
}

/**
 * Adds a finished lesson's stars to the player's country for today. Only lessons Pipo really
 * answered count (they carry a receipt), and each lesson once a day on this device. Never throws.
 */
export async function reportLesson(missionId: string, stars: number): Promise<void> {
  const receipt = takeReceipt();
  if (!receipt || countedToday().includes(missionId)) return;
  try {
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ receipt, stars }),
    });
    if (res.ok) markCounted(missionId);
  } catch {
    // The leaderboard is a bonus: a missed count never gets in the way of playing.
  }
}

let country: Promise<string | null> | null = null;

/**
 * The player's two-letter country code, as Cloudflare sees it (e.g. "HN"), or null if it isn't
 * known. Asked once per visit; a miss is asked again next time.
 */
export function fetchCountry(): Promise<string | null> {
  country ??= fetchLeaderboard().then((board) => {
    if (!board?.you) country = null;
    return board?.you ?? null;
  });
  return country;
}

/** Countries by stars today and all time, or null if the leaderboard can't be reached. */
export async function fetchLeaderboard(): Promise<Leaderboard | null> {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) return null;
    const board = (await res.json()) as Leaderboard;
    return { ...board, allTime: board.allTime ?? [] };
  } catch {
    return null;
  }
}
