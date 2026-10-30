import { useState } from "react";
import type { AgentRun, Draft, GateDecision, Mission } from "../engine/types.ts";
import { Button } from "./Button.tsx";
import { humanize } from "./SetupView.tsx";

interface Props {
  mission: Mission;
  run: AgentRun & { draft: Draft };
  onDecide: (decision: GateDecision) => void;
}

export function GateView({ mission, run, onDecide }: Props) {
  const [editing, setEditing] = useState(false);
  const gated = mission.tools.find((t) => t.id === mission.gate.beforeTool);
  const action = gated?.label.toLowerCase() ?? "go ahead";

  return (
    <section className="space-y-4 rounded-xl border-2 border-orange-400 p-4">
      <h2 className="text-xl font-semibold">
        {run.reachedGatedTool ? `Pipo wants to ${action}` : "Pipo's draft is ready"}
      </h2>
      <p>Take a look before anything goes out.</p>

      <dl className="space-y-2 rounded-lg bg-gray-100 p-3">
        {Object.entries(run.draft.fields).map(([key, value]) => (
          <div key={key}>
            <dt className="text-sm font-semibold text-gray-600">{humanize(key)}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>

      {!editing ? (
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => onDecide({ type: "approve" })}>Approve</Button>
          <Button variant="plain" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="plain" onClick={() => onDecide({ type: "stop" })}>
            Stop
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold">How should Pipo fix it?</p>
          {mission.gate.fixes.map((fix) => (
            <Button key={fix.id} variant="plain" className="w-full text-left" onClick={() => onDecide({ type: "fix", fixId: fix.id })}>
              {fix.label}
            </Button>
          ))}
          <Button variant="plain" className="w-full" onClick={() => setEditing(false)}>
            Back
          </Button>
        </div>
      )}
    </section>
  );
}
