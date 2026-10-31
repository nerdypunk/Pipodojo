// "Under the hood": a small toggle below the boxes that opens a timeline of what really
// happened. Your pieces become a message, each real Muse Spark call (what was sent, which app
// actions were offered, what came back, how long it took), then scoring by our own rules.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { readable } from "../engine/actions.ts";
import { APPROVE_MESSAGE, TOOL_NUDGE } from "../engine/agentRunner.ts";
import { callKind, type CallRecord } from "../engine/trace.ts";
import type { Mission, Score } from "../engine/types.ts";

const KEY = "pipodojo.hood";

interface Props {
  mission: Mission;
  prompt: string;
  calls: CallRecord[];
  /** A call is on its way to Muse Spark right now. */
  waiting: boolean;
  score: Score | null;
}

export function UnderTheHood({ mission, prompt, calls, waiting, score }: Props) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "open";
    } catch {
      return false;
    }
  });
  const still = useReducedMotion();
  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(KEY, o ? "closed" : "open");
      } catch {
        // Remembering is a nice-to-have.
      }
      return !o;
    });
  };

  return (
    <section className="flex flex-col items-center gap-2" aria-label="Under the hood">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="glass flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold text-brand-700 transition hover:bg-white/80"
      >
        <span aria-hidden="true">🔧</span>
        Under the hood
        {calls.length > 0 && (
          <span className="rounded-full bg-brand-600 px-2 text-xs text-white">
            {calls.length} Muse Spark {calls.length === 1 ? "call" : "calls"}
          </span>
        )}
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="hood"
            initial={still ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={still ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass w-full rounded-3xl p-3 md:p-4"
          >
            <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:overflow-x-auto md:pb-1">
              <Step icon="🧩" title="Your pieces became this message" still={still} index={0}>
                <Quote>{prompt || "Tap some pieces to build it."}</Quote>
              </Step>

              {calls.map((call, i) => (
                <Step key={i} icon="⚡" title={callTitle(call)} meta={`${(call.ms / 1000).toFixed(1)}s`} still={still} index={i + 1}>
                  <CallBody mission={mission} call={call} />
                </Step>
              ))}

              {waiting && (
                <Step icon="⏳" title="Waiting for Muse Spark…" still={still} index={calls.length + 1}>
                  <p className="animate-pulse text-sm font-semibold text-gray-500">The message is on its way to Meta's model.</p>
                </Step>
              )}

              {score && (
                <Step icon="📏" title="Scored by our rules, not a model" still={still} index={calls.length + 2}>
                  <p className="text-sm font-semibold text-gray-600">
                    {mission.flaws.length} checks on your pieces and Pipo's answer.{" "}
                    {score.missedFlaws.length === 0
                      ? "Nothing missing."
                      : `${score.missedFlaws.length} thing${score.missedFlaws.length === 1 ? "" : "s"} missing.`}
                  </p>
                  <p className="mt-1 text-lg tracking-widest text-amber-500" aria-label={`${score.stars} of 3 stars`}>
                    {"★".repeat(score.stars)}
                    <span className="text-gray-300">{"★".repeat(3 - score.stars)}</span>
                  </p>
                </Step>
              )}

              {calls.length === 0 && !waiting && (
                <li className="flex items-center px-2 text-sm font-semibold text-gray-500">
                  Press Check to see the real calls to Muse Spark.
                </li>
              )}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function callTitle(call: CallRecord): string {
  const kind = callKind(call, TOOL_NUDGE, APPROVE_MESSAGE);
  if (kind === "nudge") return "Asked again to use an app";
  if (kind === "approve") return "You tapped OK, Pipo finishes it";
  return "Sent to Muse Spark";
}

function CallBody({ mission, call }: { mission: Mission; call: CallRecord }) {
  const kind = callKind(call, TOOL_NUDGE, APPROVE_MESSAGE);
  const tools = call.request.tools?.map((t) => t.function.name) ?? [];
  const toolCall = call.reply?.toolCalls?.[0];
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {call.reply?.model && (
        <span className="w-fit rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] font-bold text-white">{call.reply.model}</span>
      )}
      <p className="font-semibold text-gray-600">
        {kind === "ask" ? (
          <>Pipo's instructions + your message{tools.length > 0 && " + app actions it may use:"}</>
        ) : (
          <Quote>{call.request.messages.at(-1)?.content ?? ""}</Quote>
        )}
      </p>
      {kind === "ask" && tools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tools.map((name) => (
            <code key={name} className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
              {name}
            </code>
          ))}
        </div>
      )}
      <p className="font-extrabold text-ink">Came back with:</p>
      {toolCall ? (
        <div className="rounded-xl bg-ink/90 p-2 font-mono text-[11px] leading-relaxed text-white">
          <span className="text-amber-300">{toolCall.name}</span>(
          {Object.entries(toolCall.args).map(([key, value]) => (
            <div key={key} className="truncate pl-3">
              <span className="text-brand-200">{key}</span>: {readable(value)}
            </div>
          ))}
          )
        </div>
      ) : call.reply ? (
        <Quote>{call.reply.content ?? "(nothing)"}</Quote>
      ) : (
        <p className="font-semibold text-gray-500">
          No answer this time{mission.tools?.length ? ", so it was finished on this device." : "."}
        </p>
      )}
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return <span className="line-clamp-4 block rounded-xl bg-white/80 px-2.5 py-1.5 font-semibold whitespace-pre-line text-ink">{children}</span>;
}

function Step({
  icon,
  title,
  meta,
  still,
  index,
  children,
}: {
  icon: string;
  title: string;
  meta?: string;
  still: boolean | null;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.li
      initial={still ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: still ? 0 : Math.min(index, 4) * 0.06 }}
      className="relative flex min-w-0 flex-col gap-1.5 rounded-2xl bg-white/60 p-3 md:w-64 md:flex-none"
    >
      <p className="flex items-center gap-1.5 font-extrabold text-ink">
        <span aria-hidden="true">{icon}</span>
        <span className="flex-1">{title}</span>
        {meta && <span className="rounded-full bg-white px-2 text-xs font-bold text-gray-500">{meta}</span>}
      </p>
      {children}
    </motion.li>
  );
}
