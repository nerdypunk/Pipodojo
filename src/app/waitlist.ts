// Joining the accounts waitlist (see functions/api/waitlist.js). Adults only: the form asks for a
// birth year in a neutral way and stops anyone who might be under 18 before anything is sent
// (COPPA). The server checks the same rule; the birth year is never stored.

export type WaitlistRole = "parent" | "teacher" | "researcher";
export type WaitlistResult = "ok" | "invalid" | "too_young" | "failed";

/** Born this many years ago or more: 18 or older whatever their birthday. Same as the server. */
export const ADULT_YEARS = 19;

export function isSurelyAdult(birthYear: number, now = new Date()): boolean {
  return Number.isInteger(birthYear) && now.getFullYear() - birthYear >= ADULT_YEARS;
}

/** Once someone is told the list is for grown-ups, the form stays closed for this visit. */
const CLOSED_KEY = "pipodojo.waitlist-closed";

export function waitlistClosed(): boolean {
  try {
    return sessionStorage.getItem(CLOSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function closeWaitlist(): void {
  try {
    sessionStorage.setItem(CLOSED_KEY, "1");
  } catch {
    // Not remembered this time; the form still shows the message now.
  }
}

/** Sends a sign-up. Never throws: every problem comes back as a friendly result. */
export async function joinWaitlist(input: {
  email: string;
  role: WaitlistRole;
  birthYear: number;
  lang: string;
  /** The hidden field people never see (bots fill it in). */
  website: string;
}): Promise<WaitlistResult> {
  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) return "ok";
    const code = ((await res.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
    if (code === "too_young") return "too_young";
    if (code === "invalid_email") return "invalid";
    return "failed";
  } catch {
    return "failed";
  }
}
