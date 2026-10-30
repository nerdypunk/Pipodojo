import type { Mission, RunStep } from "../engine/types.ts";

interface Props {
  mission: Mission;
  steps: RunStep[];
  /** Show the "thinking" row while the run is still going. */
  working?: boolean;
}

export function TraceView({ mission, steps, working = false }: Props) {
  const lines = steps.flatMap((step) => describe(mission, step));
  return (
    <section aria-live="polite" className="space-y-2">
      <h2 className="text-xl font-semibold">What Pipo did</h2>
      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li key={i} className={line.quote ? "italic text-gray-700" : "font-medium"}>
            {line.quote ? `Pipo: “${line.text}”` : `✓ ${line.text}`}
          </li>
        ))}
        {working && <li className="animate-pulse motion-reduce:animate-none">Pipo is thinking…</li>}
      </ol>
    </section>
  );
}

function describe(mission: Mission, step: RunStep): { text: string; quote?: boolean }[] {
  if (step.kind === "model") {
    // Short narration only. A long final answer is shown as the draft at the gate.
    return step.content && step.toolCalls.length ? [{ text: step.content, quote: true }] : [];
  }
  const tool = mission.tools.find((t) => t.id === step.toolId);
  if (step.kind === "gate") return [{ text: `${tool?.traceLabel ?? tool?.label ?? step.toolId}. Waiting for your OK.` }];
  if (!tool) return [{ text: "Reached for a tool it doesn't have" }];
  if (!step.ok) return [{ text: `Had trouble using ${tool.label}` }];
  return [{ text: tool.traceLabel ?? `Used ${tool.label}` }];
}
