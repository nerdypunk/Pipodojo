import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK, describeLook, parseLook } from "../src/game/pipoLook.ts";

describe("Pipo's look", () => {
  it("reads a stored look and falls back for anything unknown", () => {
    expect(parseLook({ head: "dome", body: "rocket", color: "mint" })).toEqual({ head: "dome", body: "rocket", color: "mint" });
    expect(parseLook({ head: "spiky", body: 4, color: null })).toEqual(DEFAULT_LOOK);
    expect(parseLook(undefined)).toEqual(DEFAULT_LOOK);
  });

  it("describes the look in plain words for the postcard prompt", () => {
    expect(describeLook({ head: "boxy", body: "wheels", color: "sky" })).toBe(
      "a small friendly sky blue robot named Pipo with a square head with little bolts, a dark visor with glowing eyes, and a body that rolls on one big wheel",
    );
  });
});
