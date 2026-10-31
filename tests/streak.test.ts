import { describe, expect, it } from "vitest";
import { currentDays, dayKey, parseStreak, playedOn } from "../src/game/streak.ts";

describe("day streak", () => {
  it("starts at 1, grows on the next day, holds on the same day and resets after a gap", () => {
    const first = playedOn(null, "2026-10-30");
    expect(first).toEqual({ days: 1, last: "2026-10-30" });
    expect(playedOn(first, "2026-10-30")).toEqual(first);
    const second = playedOn(first, "2026-10-31");
    expect(second).toEqual({ days: 2, last: "2026-10-31" });
    expect(playedOn(second, "2026-11-01")).toEqual({ days: 3, last: "2026-11-01" });
    expect(playedOn(second, "2026-11-03")).toEqual({ days: 1, last: "2026-11-03" });
  });

  it("counts across month ends", () => {
    expect(playedOn({ days: 4, last: "2026-10-31" }, "2026-11-01").days).toBe(5);
  });

  it("shows the streak while it's alive, and 0 once a day is missed", () => {
    const s = { days: 3, last: "2026-10-30" };
    expect(currentDays(s, "2026-10-30")).toBe(3);
    expect(currentDays(s, "2026-10-31")).toBe(3);
    expect(currentDays(s, "2026-11-01")).toBe(0);
    expect(currentDays(null, "2026-11-01")).toBe(0);
  });

  it("reads stored values safely", () => {
    expect(parseStreak({ days: 2, last: "2026-10-31" })).toEqual({ days: 2, last: "2026-10-31" });
    expect(parseStreak({ days: 0, last: "2026-10-31" })).toBeNull();
    expect(parseStreak("nope")).toBeNull();
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
