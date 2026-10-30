// Runs a mission's key setups against the live API and reports how often each flaw shows up.
// Goes through the real proxy code (functions/api/chat.js) with the key from .dev.vars.
//
//   npm run check:mission -- biz-01-refund --runs 5 [--out results.json]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { onRequest } from "../functions/api/chat.js";
import { runAgent } from "../src/engine/agentRunner.ts";
import { activeFlaws, isCorrectDecision } from "../src/engine/evaluator.ts";
import { loadMissions } from "../src/engine/missionLoader.ts";
import { createHttpModelClient } from "../src/engine/modelClient.ts";
import type { Mission, RunStep, Setup } from "../src/engine/types.ts";

const root = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const missionId = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--")) ?? "biz-01-refund";
const runs = Number(flag("runs") ?? 3);
const outPath = flag("out");

function readDevVars(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(join(root, ".dev.vars"), "utf8").split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]!] = match[2]!.trim();
  }
  return env;
}

/** The key setups from SPEC section 13. */
export function keySetups(mission: Mission): Record<string, Setup> {
  const required = mission.tools.filter((t) => t.role === "required").map((t) => t.id);
  const good = mission.goals.find((g) => g.quality === "good")!.id;
  const setups: Record<string, Setup> = { best: { equipped: required, goalId: good } };
  for (const flaw of mission.gate.flaws) {
    const [kind, ref] = flaw.when.split(":") as [string, string];
    if (kind === "tool_missing") setups[`missing-${ref}`] = { equipped: required.filter((id) => id !== ref), goalId: good };
    if (kind === "goal") setups[`goal-${ref}`] = { equipped: required, goalId: ref };
  }
  for (const trap of mission.tools.filter((t) => t.role === "trap")) {
    setups[`trap-${trap.id}`] = { equipped: [...required, trap.id], goalId: good };
  }
  return setups;
}

const describeStep = (s: RunStep) =>
  s.kind === "model" ? `model(${s.ms}ms)` : s.kind === "gate" ? `GATE:${s.toolId}` : `${s.toolId}${s.ok ? "" : "!"}`;

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
    timeoutMs: 10_000,
    fetch: (url, init) => onRequest({ request: new Request(url, init), env }),
  });

  console.log(`Mission ${mission.id}, model ${env["MODEL_ID"] ?? "muse-spark-1.2 (default)"}, ${runs} runs per setup\n`);
  const results: unknown[] = [];

  for (const [key, setup] of Object.entries(keySetups(mission))) {
    const flawCounts: Record<string, number> = {};
    let failures = 0;
    for (let i = 1; i <= runs; i++) {
      const started = performance.now();
      const run = await runAgent({ mission, setup, client, now: () => performance.now() });
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      if (run.status === "failed") {
        failures++;
        console.log(`  [${key} #${i}] FAILED after ${seconds}s: ${run.failure}`);
        results.push({ setup: key, run });
        continue;
      }
      const flaws = activeFlaws(mission, setup, run.draft).map((f) => f.id);
      for (const f of flaws) flawCounts[f] = (flawCounts[f] ?? 0) + 1;
      const approveOk = isCorrectDecision(mission, activeFlaws(mission, setup, run.draft), { type: "approve" });
      const body = (run.draft?.fields["body"] ?? run.draft?.text ?? "").replace(/\s+/g, " ");
      console.log(`  [${key} #${i}] ${seconds}s  ${run.steps.map(describeStep).join(" > ")}`);
      console.log(`      flaws: ${flaws.join(", ") || "none"}  (approve is ${approveOk ? "correct" : "WRONG"})`);
      console.log(`      draft: ${body.slice(0, 260)}${body.length > 260 ? "…" : ""}`);
      results.push({ setup: key, equipped: setup.equipped, goalId: setup.goalId, seconds: Number(seconds), activeFlaws: flaws, run });
    }
    const summary = Object.entries(flawCounts).map(([f, n]) => `${f} ${n}/${runs}`).join(", ") || "no flaws";
    console.log(`=> ${key}: ${summary}${failures ? `, ${failures} failed` : ""}\n`);
  }

  if (outPath) writeFileSync(outPath, JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
