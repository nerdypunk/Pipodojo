import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseMission } from "../src/engine/missionLoader.ts";
import type { Mission, ModelClient, ModelReply, ModelRequest } from "../src/engine/types.ts";

export const MISSIONS_DIR = join(import.meta.dirname, "..", "missions");

export function readMissionFiles(): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  for (const name of readdirSync(MISSIONS_DIR).filter((n) => n.endsWith(".json"))) {
    files[name] = JSON.parse(readFileSync(join(MISSIONS_DIR, name), "utf8"));
  }
  return files;
}

export function dinnerMission(): Mission {
  return parseMission(readMissionFiles()["parent-01-dinner.json"], "parent-01-dinner.json");
}

/** The best prompt for the dinner lesson. */
export const BEST_DINNER = ["plan_dinner", "vegetarian", "budget", "short_list"];

/** A fake model that replies from a script and remembers every request. */
export function scriptedClient(replies: (ModelReply | Error)[]) {
  const requests: ModelRequest[] = [];
  let i = 0;
  const client: ModelClient = {
    async complete(request) {
      requests.push(structuredClone(request));
      const reply = replies[i++];
      if (!reply) throw new Error("Script ran out of replies");
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
  return { client, requests };
}

/** A clock that advances 100 ms every time it is read. */
export function fakeClock() {
  let t = 0;
  return () => (t += 100);
}
