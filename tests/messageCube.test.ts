import { describe, expect, it } from "vitest";
import { loadMissions } from "../src/engine/missionLoader.ts";
import { cubePieces, cubeVerdict, type Cell } from "../src/game/messageCube.ts";
import { readMissionFiles } from "./helpers.ts";

const missions = loadMissions(readMissionFiles());
const key = (c: Cell) => c.join(",");
const touching = (a: Cell, b: Cell) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) === 1;

describe("message cube", () => {
  it.each(missions.map((m) => [m.id, m] as const))("%s: the good pieces fill the cube exactly, each in one chunk", (_, mission) => {
    const good = cubePieces(mission).filter((p) => p.quality === "good");
    const cells = good.flatMap((p) => p.cells.map(key));
    expect(cells.sort()).toEqual(["0,0,0", "0,0,1", "0,1,0", "0,1,1", "1,0,0", "1,0,1", "1,1,0", "1,1,1"]);
    for (const piece of good) {
      // Every cell of a chunk touches the one before it.
      piece.cells.slice(1).forEach((cell, i) => expect(touching(cell, piece.cells[i]!)).toBe(true));
    }
  });

  it("says how the cube came out", () => {
    const mission = missions.find((m) => m.id === "cafe-01-sale-post")!;
    const pieces = cubePieces(mission);
    expect(cubeVerdict(pieces, ["write_post", "discount", "when", "friendly"])).toBe("fits");
    expect(cubeVerdict(pieces, ["write_post", "discount", "when", "friendly", "hashtags"])).toBe("fits");
    expect(cubeVerdict(pieces, ["write_post", "discount", "friendly"])).toBe("gaps");
    expect(cubeVerdict(pieces, ["write_post", "discount", "when", "pushy"])).toBe("bumps");
  });
});
