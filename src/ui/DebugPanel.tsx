/** Shown only with ?debug=1: the raw run log, active flaws, and score breakdown. */
export function DebugPanel({ data }: { data: unknown }) {
  return (
    <details open className="rounded-lg border border-dashed p-3 text-xs">
      <summary className="cursor-pointer font-semibold">Debug</summary>
      <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
