// Plays a lesson's key prompts against the live API and reports how often each flaw shows up.
// Goes through the real proxy code (functions/api/chat.js) with the key from .dev.vars.
//
//   npm run check:mission -- parent-01-dinner --runs 5 [--setup best] [--out results.json]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { onRequest } from "../functions/api/chat.js";
import { askPipo } from "../src/engine/agentRunner.ts";
import { togglePick } from "../src/engine/brief.ts";
import { evaluate } from "../src/engine/evaluator.ts";
import { loadMissions } from "../src/engine/missionLoader.ts";
import { createHttpModelClient } from "../src/engine/modelClient.ts";
import type { Mission } from "../src/engine/types.ts";

const root = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const missionId = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--")) ?? "parent-01-dinner";
const runs = Number(flag("runs") ?? 3);
const outPath = flag("out");
const onlySetup = flag("setup");

function readDevVars(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(join(root, ".dev.vars"), "utf8").split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]!] = match[2]!.trim();
  }
  return env;
}

/** The best prompt, plus one variant per flaw (leave out a good piece, or swap in a weak one). */
export function keySetups(mission: Mission): Record<string, string[]> {
  const best = mission.slots.flatMap((slot) => {
    const good = slot.pieces.filter((p) => p.quality === "good");
    if (slot.pick === "many") return good.map((p) => p.id);
    return [(good[0] ?? slot.pieces.find((p) => p.quality === "neutral") ?? slot.pieces[0]!).id];
  });
  const setups: Record<string, string[]> = { best };
  for (const flaw of mission.flaws) {
    const [kind, ref] = flaw.when.split(":") as [string, string];
    setups[flaw.id] = kind === "not_picked" ? best.filter((id) => id !== ref) : togglePick(mission, best, ref);
  }
  return setups;
}

async function main() {
  const files: Record<string, unknown> = {};
  for (const name of readdirSync(join(root, "missions")).filter((n) => n.endsWith(".json"))) {
    files[name] = JSON.parse(readFileSync(join(root, "missions", name), "utf8"));
  }
  const mission = loadMissions(files).find((m) => m.id === missionId);
  if (!mission) throw new Error(`No mission "${missionId}"`);

  const env = readDevVars();
  const client = createHttpModelClient({
    url: "http://local/api/chat",
    timeoutMs: 15_000,
    fetch: (url, init) => onRequest({ request: new Request(url, init), env }),
  });

  console.log(`Lesson ${mission.id}, model ${env["MODEL_ID"] ?? "muse-spark-1.2 (default)"}, ${runs} runs per setup\n`);
  const results: unknown[] = [];

  for (const [key, picks] of Object.entries(keySetups(mission))) {
    if (onlySetup && key !== onlySetup) continue;
    const counts: Record<string, number> = {};
    const stars: number[] = [];
    console.log(`--- ${key}: ${picks.join(", ")}`);
    for (let i = 1; i <= runs; i++) {
      const run = await askPipo({ mission, picks, client, now: () => performance.now() });
      if (run.status === "failed") {
        console.log(`  #${i} FAILED: ${run.failure}`);
        results.push({ setup: key, picks, run });
        continue;
      }
      const score = evaluate(mission, picks, run.answer);
      stars.push(score.stars);
      for (const f of score.visibleFlaws) counts[f] = (counts[f] ?? 0) + 1;
      const answer = run.answer.replace(/\s+/g, " ");
      console.log(`  #${i} ${(run.ms / 1000).toFixed(1)}s  ${score.stars}★  visible: ${score.visibleFlaws.join(", ") || "none"}`);
      console.log(`      ${answer.slice(0, 240)}${answer.length > 240 ? "…" : ""}`);
      results.push({ setup: key, picks, run, score });
    }
    const summary = Object.entries(counts).map(([f, n]) => `${f} ${n}/${runs}`).join(", ") || "no visible flaws";
    console.log(`=> ${key}: ${summary}; stars ${stars.join(" ")}\n`);
  }

  if (outPath) writeFileSync(outPath, JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
