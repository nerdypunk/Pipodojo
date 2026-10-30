// Milestone 1 spike: one bare tool-calling loop through /api/chat.
// Throwaway page; the real runner lives in src/engine from milestone 2.
import { useState } from "react";

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type Step =
  | { kind: "request"; step: number; body: unknown }
  | { kind: "response"; step: number; ms: number; body: unknown }
  | { kind: "tool_call"; name: string; args: string }
  | { kind: "tool_result"; name: string; result: unknown }
  | { kind: "final"; text: string }
  | { kind: "error"; text: string };

const MAX_STEPS = 6;

const SYSTEM_PROMPT =
  "You help a small shop owner with customer emails. Use only the tools you have.";

const GOAL =
  "A customer named Dana asks: 'When did I buy my jacket, order #1042?' Look up the order and write a one-sentence answer for the owner.";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "orders_lookup",
      description: "Finds a customer's order details.",
      parameters: {
        type: "object",
        properties: { order_number: { type: "string" } },
        required: ["order_number"],
      },
    },
  },
];

const FAKE_ORDER = { order: "#1042", item: "Jacket", purchased_days_ago: 45, price: 80 };

function runFakeTool(name: string, rawArgs: string): unknown {
  if (name !== "orders_lookup") return { error: `Unknown tool: ${name}` };
  try {
    JSON.parse(rawArgs || "{}");
  } catch {
    return { error: "Arguments were not valid JSON." };
  }
  return FAKE_ORDER;
}

export function SpikePage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [totalMs, setTotalMs] = useState<number | null>(null);

  async function run() {
    setRunning(true);
    setSteps([]);
    setTotalMs(null);
    const log = (s: Step) => setSteps((prev) => [...prev, s]);
    const started = performance.now();

    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: GOAL },
    ];

    try {
      for (let step = 1; step <= MAX_STEPS; step++) {
        const body = { messages, tools: TOOLS };
        log({ kind: "request", step, body });

        const t0 = performance.now();
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        log({ kind: "response", step, ms: Math.round(performance.now() - t0), body: json });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const message = json.choices?.[0]?.message as
          | { content: string | null; tool_calls?: ToolCall[] }
          | undefined;
        if (!message) throw new Error("No message in response");

        if (!message.tool_calls?.length) {
          log({ kind: "final", text: message.content ?? "(empty)" });
          return;
        }

        messages.push({ role: "assistant", content: message.content, tool_calls: message.tool_calls });
        for (const call of message.tool_calls) {
          log({ kind: "tool_call", name: call.function.name, args: call.function.arguments });
          const result = runFakeTool(call.function.name, call.function.arguments);
          log({ kind: "tool_result", name: call.function.name, result });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
        }
      }
      log({ kind: "error", text: `Stopped after ${MAX_STEPS} steps without a final answer.` });
    } catch (err) {
      log({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setTotalMs(Math.round(performance.now() - started));
      setRunning(false);
    }
  }

  return (
    <main>
      <h1>Pipodojo spike: one tool-calling loop</h1>
      <p>System: {SYSTEM_PROMPT}</p>
      <p>Goal: {GOAL}</p>
      <button type="button" onClick={run} disabled={running}>
        {running ? "Running…" : "Run"}
      </button>
      {totalMs !== null && <p>Total run time: {totalMs} ms</p>}
      <ol>
        {steps.map((s, i) => (
          <li key={i}>
            <StepView step={s} />
          </li>
        ))}
      </ol>
    </main>
  );
}

function StepView({ step }: { step: Step }) {
  switch (step.kind) {
    case "request":
      return <Block title={`Model request (step ${step.step})`} data={step.body} />;
    case "response":
      return <Block title={`Model response (step ${step.step}, ${step.ms} ms)`} data={step.body} />;
    case "tool_call":
      return <Block title={`Tool call: ${step.name}`} data={step.args} />;
    case "tool_result":
      return <Block title={`Tool result: ${step.name}`} data={step.result} />;
    case "final":
      return <Block title="Final answer" data={step.text} />;
    case "error":
      return <Block title="Error" data={step.text} />;
  }
}

function Block({ title, data }: { title: string; data: unknown }) {
  return (
    <section>
      <h2>{title}</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
