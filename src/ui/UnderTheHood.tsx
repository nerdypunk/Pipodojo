// "Under the hood": a toggle below the lesson that opens an advanced, devtools-style view of what
// really happened, without repeating what the lesson already shows:
//   - Calls: every real Muse Spark call as a waterfall bar, sized by how long it took.
//   - Inspector: the chosen call's request (model, messages, the app actions offered with their
//     fields) and response (the exact tool call and arguments), as colored JSON.
//   - Rule checks: each check the lesson ran on your pieces and Pipo's answer, by its code name,
//     and what it found. Scoring is our own rules in code, never a model.
// Labels follow the language; code names and JSON stay as they are. Every part carries a short
// plain-language note, so it reads for people who aren't engineers, and the first time someone
// opens it a small dialog says what they're about to see.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { play } from "../app/sound.ts";
import { phrasesFor } from "../engine/agentRunner.ts";
import { hasGoodGoal } from "../engine/brief.ts";
import { callKind, type CallKind, type CallRecord } from "../engine/trace.ts";
import type { Mission, Score, ToolDefinition } from "../engine/types.ts";
import { useLang, type Strings } from "../i18n/index.tsx";

const KEY = "pipodojo.hood";
/** Set once someone has seen the "you're about to see the AI at work" dialog. */
const INTRO_KEY = "pipodojo.hood.intro";
/** Also kept in memory, so a browser that blocks storage still sees the dialog only once a visit. */
let introSeen = false;

function hasSeenIntro(): boolean {
  if (introSeen) return true;
  try {
    return localStorage.getItem(INTRO_KEY) === "seen";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  introSeen = true;
  try {
    localStorage.setItem(INTRO_KEY, "seen");
  } catch {
    // Remembering is a nice-to-have.
  }
}

interface Props {
  mission: Mission;
  picks: readonly string[];
  calls: CallRecord[];
  /** A call is on its way to Muse Spark right now. */
  waiting: boolean;
  score: Score | null;
  /** The toggle button, for the first-time tour to point at. */
  buttonRef?: RefObject<HTMLButtonElement>;
}

export function UnderTheHood({ mission, picks, calls, waiting, score, buttonRef }: Props) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "open";
    } catch {
      return false;
    }
  });
  const still = useReducedMotion();
  const { t } = useLang();
  const [intro, setIntro] = useState(false);
  const show = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? "open" : "closed");
    } catch {
      // Remembering is a nice-to-have.
    }
  };
  // The first time someone opens it, a short dialog says what they're about to see.
  const toggle = () => {
    if (!open && !hasSeenIntro()) setIntro(true);
    else show(!open);
  };

  return (
    <section className="flex flex-col items-center gap-2" aria-label={t.hood.title}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="glass flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold text-brand-700 transition hover:bg-white/80"
      >
        <span aria-hidden="true">🔧</span>
        {t.hood.title}
        {calls.length > 0 && <span className="rounded-full bg-brand-600 px-2 text-xs text-white">{t.hood.calls(calls.length)}</span>}
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
            className="w-full"
          >
            <Console mission={mission} picks={picks} calls={calls} waiting={waiting} score={score} still={!!still} t={t} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intro && (
          <HoodIntro
            still={!!still}
            t={t}
            onGo={() => {
              markIntroSeen();
              setIntro(false);
              show(true);
            }}
            onClose={() => setIntro(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

/** "You're about to see the AI at work": once, before the advanced view opens the first time. */
function HoodIntro({ still, t, onGo, onClose }: { still: boolean; t: Strings; onGo: () => void; onClose: () => void }) {
  const i = t.hood.welcome;
  const title = useId();
  const go = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    opener.current = document.activeElement;
    go.current?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Keep Tab inside the dialog: there are only two buttons.
      if (e.key === "Tab") {
        const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-hood-intro] button")];
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        buttons[(at + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
      }
    };
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("keydown", keys);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      data-hood-intro=""
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0d0a24]/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: still ? 0 : 0.2 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title}
        onClick={(e) => e.stopPropagation()}
        initial={still ? false : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={still ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
        transition={still ? { duration: 0 } : { type: "spring", bounce: 0.25, duration: 0.45 }}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-[#16122f] p-6 text-brand-100 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] ring-1 ring-white/10"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500/25 text-2xl ring-1 ring-brand-400/40">
            🔬
          </span>
          <h2 id={title} className="text-xl leading-tight font-black text-white">
            {i.title}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed font-semibold text-brand-200">{i.body}</p>
        <ul className="mt-4 space-y-2">
          {i.parts.map((part) => (
            <li key={part.title} className="flex gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <span aria-hidden="true" className="text-lg leading-6">
                {part.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-extrabold text-white">{part.title}</span>
                <span className="block text-sm font-semibold text-brand-200">{part.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-3 font-extrabold text-brand-200 ring-1 ring-white/15 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-300"
          >
            {i.later}
          </button>
          <button
            ref={go}
            type="button"
            onClick={() => {
              play("tap");
              onGo();
            }}
            className="flex-1 rounded-2xl bg-brand-500 py-3 font-black text-white shadow-[0_10px_24px_-10px_rgb(110_92_242/0.9)] transition hover:bg-brand-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
          >
            {i.go}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function Console({ mission, picks, calls, waiting, score, still, t }: Props & { still: boolean; t: Strings }) {
  // The call being inspected: the newest one unless the player picked another.
  const [chosen, setChosen] = useState<number | null>(null);
  const [tab, setTab] = useState<"request" | "response">("response");
  useEffect(() => {
    if (!calls.length) setChosen(null);
  }, [calls.length]);
  const at = chosen !== null && chosen < calls.length ? chosen : calls.length - 1;
  const call = calls[at];
  const model = calls.find((c) => c.reply?.model)?.reply?.model ?? "muse-spark";
  const totalMs = calls.reduce((sum, c) => sum + c.ms, 0);
  const actions = calls.reduce((sum, c) => sum + (c.reply?.toolCalls?.length ?? 0), 0);
  const asked = calls.length > 0 || waiting;
  const answered = calls.length > 0;
  const checked = !!score;
  const [grid, setGrid] = useState<HTMLDivElement | null>(null);
  // Re-measured whenever the steps light up, the inspected call or tab changes, or the language does.
  const wires = useFlowWires(grid, `${asked}${answered}${checked}${at}${tab}${t.hood.flow.happened}`);

  return (
    <div className="overflow-hidden rounded-3xl bg-[#16122f] text-brand-100 shadow-[0_24px_60px_-24px_rgb(22_18_47/0.8)] ring-1 ring-white/10">
      {/* Title bar: the model and the totals. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 px-4 py-2.5 text-xs font-bold">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b8b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </span>
        <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white">⚡ {model}</span>
        <span className="text-brand-200">{t.hood.calls(calls.length)}</span>
        {totalMs > 0 && <span className="text-brand-200">⏱ {seconds(totalMs)} {t.hood.total}</span>}
        {actions > 0 && <span className="text-brand-200">🛠 {t.hood.actions(actions)}</span>}
      </div>
      {/* One plain line on what this view is, for players who've never seen a devtools panel. */}
      <p className="border-b border-white/10 px-4 py-2 text-xs leading-relaxed font-semibold text-brand-200">{t.hood.intro}</p>

      {calls.length === 0 && !waiting ? (
        <p className="px-4 py-6 text-center text-sm font-semibold text-brand-200">{t.hood.pressCheck}</p>
      ) : (
        // A small flow chart: ① what you asked → ② what the AI did → ③ how we checked it, joined by
        // wires that carry energy forward as each step happens.
        <div ref={setGrid} className="relative grid gap-px bg-white/10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Computers: one tube from each step's pill to the next step's arrow, drawn over the seam. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 hidden md:block">
            {wires.map((w, i) => (
              <Tube
                key={i}
                on={i === 0 ? asked : checked}
                still={still}
                length={w.width}
                className="absolute top-[26px] h-3"
                style={{ left: w.left, width: w.width }}
              />
            ))}
          </div>
          <Pane step={1} heading={t.hood.flow.asked} lit={asked} still={still} title={t.hood.timeline} sub={t.hood.timelineSub}>
            <Waterfall mission={mission} calls={calls} waiting={waiting} at={at} onPick={setChosen} still={still} t={t} />
          </Pane>

          <WireDown on={asked} still={still} />
          <Pane
            step={2}
            still={still}
            heading={t.hood.flow.happened}
            lit={answered}
            wireIn={asked}
            center
            title={call ? `#${at + 1} · ${t.hood.kinds[kindOf(mission, call)]}` : t.hood.waiting}
            sub={tab === "request" ? t.hood.requestSub : t.hood.responseSub}
            extra={
              call && (
                <span className="flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10">
                  {(["request", "response"] as const).map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={tab === name}
                      onClick={() => setTab(name)}
                      className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold transition-colors ${
                        tab === name ? "bg-brand-500 text-white" : "text-brand-200 hover:text-white"
                      }`}
                    >
                      {t.hood[name]}
                    </button>
                  ))}
                </span>
              )
            }
          >
            {call ? (
              tab === "request" ? (
                <>
                  <Json value={requestView(call)} />
                  <Glossary keys={requestKeys(call)} t={t} />
                </>
              ) : call.reply ? (
                <>
                  <Json value={responseView(call)} />
                  <Glossary keys={responseKeys(call)} t={t} />
                </>
              ) : (
                <p className="font-mono text-xs text-brand-200">
                  {"// "}{t.hood.noAnswer}
                  {mission.tools?.length ? t.hood.finishedHere : t.hood.stop}
                </p>
              )
            ) : (
              <p className="animate-pulse font-mono text-xs text-brand-200 motion-reduce:animate-none">{"// "}{t.hood.waitingSub}</p>
            )}
          </Pane>

          <WireDown on={checked} still={still} />
          <Pane step={3} heading={t.hood.flow.checked} lit={checked} still={still} wireIn={checked} title={t.hood.rules} sub={t.hood.rulesSub}>
            <Rules mission={mission} picks={picks} score={score} t={t} />
          </Pane>
        </div>
      )}
    </div>
  );
}

interface PaneProps {
  /** Its place in the flow: 1, 2 or 3. */
  step: number;
  /** The plain title ("What you asked"); `title` is the technical one under it. */
  heading: string;
  /** Lit once this step has happened. */
  lit: boolean;
  /** Computers: the wire into this step (an arrow before its pill), carrying energy or not yet. */
  wireIn?: boolean;
  /** Computers: center the step's pill in its column (the middle step). */
  center?: boolean;
  /** Reduced motion: wires fill instead of carrying moving beads. */
  still: boolean;
  title: string;
  sub: string;
  extra?: ReactNode;
  children: ReactNode;
}

function Pane({ step, heading, lit, wireIn, center = false, still, title, sub, extra, children }: PaneProps) {
  return (
    <div className="relative flex min-w-0 flex-col gap-2.5 bg-[#16122f] p-3.5">
      <div>
        {/* [arrow in] [step pill]. The tubes between steps are drawn by the panel (see useFlowWires). */}
        <div className={`flex items-center ${center ? "md:justify-center" : ""}`}>
          {/* A left-aligned step's arrow sits on the seam between columns, to leave its pill room. */}
          {wireIn !== undefined && (
            <Cap on={wireIn} data-flow-cap={step} className={`relative z-20 mr-1.5 hidden md:flex ${center ? "" : "-ml-[26px]"}`} />
          )}
        <div
          data-flow-pill={step}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 ring-1 lg:pr-3.5 transition-colors duration-500 ${
            lit ? "bg-brand-500/20 ring-brand-400/50" : "bg-white/[0.06] ring-white/10"
          }`}
        >
          <motion.span
            key={lit ? "lit" : "dim"}
            aria-hidden="true"
            initial={lit && !still ? { scale: 0.55 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 13, mass: 0.7 }}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-b-2 text-sm font-black ${
              lit ? "border-brand-800 bg-brand-500 text-white shadow-[0_0_14px_rgb(140_125_251/0.8)]" : "border-white/5 bg-white/10 text-brand-300"
            }`}
          >
            {step}
          </motion.span>
          <h3 className={`text-[13px] font-black transition-colors duration-500 lg:text-sm ${lit ? "text-white" : "text-brand-200"}`}>{heading}</h3>
        </div>
        </div>
        <div className="mt-2.5 flex min-h-6 items-center justify-between gap-2">
          <p className="text-[11px] font-black tracking-wider text-brand-300 uppercase">{title}</p>
          {extra}
        </div>
        {/* What this part shows, in plain words. */}
        <p className="mt-0.5 text-xs leading-snug font-semibold text-brand-200/80">{sub}</p>
      </div>
      {children}
    </div>
  );
}

interface Wire {
  left: number;
  width: number;
}

/**
 * Where to draw the tubes on computers: from the end of step 1's pill to step 2's arrow, and from
 * step 2's pill to step 3's arrow, measured from the real layout, so they join up at any width, in
 * any language, with the middle step centered. Their height needs no measuring: every pill sits on
 * the same row, so the tubes are placed by CSS (top-[26px]: the pane's padding plus half a pill,
 * less half a tube). Measured again whenever anything in the flow could have moved.
 */
function useFlowWires(grid: HTMLDivElement | null, changes: string): Wire[] {
  const [wires, setWires] = useState<Wire[]>([]);
  useLayoutEffect(() => {
    if (!grid) return;
    const measure = () => {
      const box = grid.getBoundingClientRect();
      const next: Wire[] = [];
      for (const n of [1, 2]) {
        const from = grid.querySelector(`[data-flow-pill="${n}"]`)?.getBoundingClientRect();
        const to = grid.querySelector(`[data-flow-cap="${n + 1}"]`)?.getBoundingClientRect();
        // The arrows are hidden on phones, where the steps stack and WireDown joins them instead.
        if (!from || !to || !to.width) continue;
        const left = Math.round(from.right - box.left + 6);
        next.push({ left, width: Math.max(0, Math.round(to.left - box.left + 12 - left)) });
      }
      setWires((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    // Anything that could move a pill or an arrow: the panel, each column, each pill and arrow.
    const watch = new ResizeObserver(measure);
    watch.observe(grid);
    for (const el of grid.querySelectorAll("[data-flow-pill], [data-flow-cap], :scope > div")) watch.observe(el);
    // The panel slides open and fonts arrive late; measure again once both have settled.
    const settled = window.setTimeout(measure, 350);
    void document.fonts?.ready.then(measure);
    document.fonts?.addEventListener("loadingdone", measure);
    window.addEventListener("resize", measure);
    return () => {
      watch.disconnect();
      window.clearTimeout(settled);
      document.fonts?.removeEventListener("loadingdone", measure);
      window.removeEventListener("resize", measure);
    };
  }, [grid, changes]);
  return wires;
}

/** The same wire on phones, where the steps stack: straight down between them. */
function WireDown({ on, still }: { on: boolean; still: boolean }) {
  return (
    <div aria-hidden="true" className="flex flex-col items-center bg-[#16122f] py-1.5 md:hidden">
      <Tube on={on} still={still} vertical className="relative -mb-1.5 h-7 w-3" />
      <Cap on={on} vertical className="relative" />
    </div>
  );
}

/**
 * The tube itself. Once its step has happened, beads of light bounce along it toward the next step.
 * The caller sets its position (absolute or relative) in `className`.
 */
function Tube({
  on,
  still,
  vertical = false,
  length = 40,
  className,
  style,
}: {
  on: boolean;
  still: boolean;
  vertical?: boolean;
  /** In pixels: beads cross a long tube in more time, so they always move at the same speed. */
  length?: number;
  className: string;
  style?: React.CSSProperties;
}) {
  const duration = Math.max(1.2, length / 160);
  return (
    <span
      style={style}
      className={`block overflow-hidden rounded-full ring-1 shadow-[inset_0_1px_3px_rgb(0_0_0/0.45)] transition-colors duration-500 ${
        on ? (still ? "bg-brand-400/70 ring-brand-400/60" : "bg-brand-500/35 ring-brand-400/50") : "bg-white/[0.07] ring-white/10"
      } ${className}`}
    >
      {on &&
        !still &&
        [0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`absolute h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgb(196_189_255)] ${vertical ? "hood-bead-y left-0.5" : "hood-bead-x top-0.5"}`}
            style={{ animationDuration: `${duration}s`, animationDelay: `${(i * duration) / 4}s` }}
          />
        ))}
    </span>
  );
}

/** The round arrow at the end of a wire, chunky like the app's buttons. */
function Cap({
  on,
  vertical = false,
  className = "",
  ...rest
}: { on: boolean; vertical?: boolean; className?: string; "data-flow-cap"?: number }) {
  const Icon = vertical ? ChevronDown : ChevronRight;
  return (
    <span
      {...rest}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-b-2 transition-colors duration-500 ${className} ${
        on ? "border-brand-800 bg-brand-500 text-white shadow-[0_0_12px_rgb(140_125_251/0.8)]" : "border-white/5 bg-[#2a2357] text-brand-300"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={3} />
    </span>
  );
}

/** Each call as a bar on one time line, like a browser's network tab. Tap a row to inspect it. */
function Waterfall({
  mission,
  calls,
  waiting,
  at,
  onPick,
  still,
  t,
}: {
  mission: Mission;
  calls: CallRecord[];
  waiting: boolean;
  at: number;
  onPick: (i: number) => void;
  still: boolean;
  t: Strings;
}) {
  const total = Math.max(1, calls.reduce((sum, c) => sum + c.ms, 0));
  let start = 0;
  return (
    <ol className="flex flex-col gap-1.5">
      {calls.map((call, i) => {
        const left = (start / total) * 100;
        const width = Math.max(3, (call.ms / total) * 100);
        start += call.ms;
        const kind = kindOf(mission, call);
        const tool = call.reply?.toolCalls?.[0]?.name;
        return (
          <li key={i}>
            <button
              type="button"
              aria-pressed={i === at}
              onClick={() => onPick(i)}
              className={`w-full rounded-xl px-2.5 py-2 text-left ring-1 transition-colors ${
                i === at ? "bg-white/10 ring-brand-400/60" : "ring-transparent hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                <span className="font-mono text-brand-300">#{i + 1}</span>
                <span className={`rounded px-1.5 font-mono text-[10px] ${KIND_TAG[kind]}`}>{kind}</span>
                <span className="min-w-0 flex-1 truncate text-white">{t.hood.kinds[kind]}</span>
                <span className="font-mono text-brand-200">{seconds(call.ms)}</span>
              </span>
              <span className="relative mt-1.5 block h-2 rounded-full bg-white/5">
                <motion.span
                  className={`absolute inset-y-0 rounded-full ${KIND_BAR[kind]}`}
                  style={{ left: `${left}%`, width: `${width}%`, transformOrigin: "left" }}
                  initial={still ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, delay: still ? 0 : i * 0.08, ease: "easeOut" }}
                />
              </span>
              <span className="mt-1 block truncate font-mono text-[11px] text-brand-200">
                {call.reply ? (tool ? `→ ${tool}()` : `→ text · ${call.reply.content?.length ?? 0} chars`) : "→ —"}
              </span>
            </button>
          </li>
        );
      })}
      {waiting && (
        <li className="px-2.5 py-2">
          <span className="flex items-center gap-2 text-xs font-bold text-white">
            <span className="font-mono text-brand-300">#{calls.length + 1}</span>
            {t.hood.waiting}
          </span>
          <span className="mt-1.5 block h-2 animate-pulse rounded-full bg-gradient-to-r from-brand-500/20 via-brand-400 to-brand-500/20 motion-reduce:animate-none" />
        </li>
      )}
    </ol>
  );
}

const KIND_TAG: Record<CallKind, string> = {
  ask: "bg-brand-500/30 text-brand-100",
  nudge: "bg-amber-300/20 text-amber-200",
  approve: "bg-emerald-300/20 text-emerald-200",
};
const KIND_BAR: Record<CallKind, string> = {
  ask: "bg-brand-400",
  nudge: "bg-amber-300",
  approve: "bg-emerald-300",
};

/** Every check the lesson ran, by its code name, and what it found. */
function Rules({ mission, picks, score, t }: { mission: Mission; picks: readonly string[]; score: Score | null; t: Strings }) {
  if (!score) return <p className="font-mono text-xs text-brand-200">{"// "}{t.hood.rulesLater}</p>;
  const goal = hasGoodGoal(mission, picks);
  const label = (id: string) => mission.slots.flatMap((s) => s.pieces).find((p) => p.id === id)?.label ?? id;
  /** The check as a plain question, from its condition: "Did you include …?" or "Did you avoid …?" */
  const question = (when: string) => {
    const [kind, id] = when.split(":") as [string, string];
    return kind === "picked" ? t.hood.check.avoid(label(id)) : t.hood.check.include(label(id));
  };
  const rows: { name: string; question: string; detail: string; status: Status }[] = [
    { name: "goal", question: t.hood.check.goal, detail: "required slots · good piece", status: goal ? "pass" : "gap" },
    { name: "weak_pieces", question: t.hood.check.weak, detail: `${score.weakPicks.length} picked`, status: score.weakPicks.length ? "gap" : "pass" },
    ...mission.flaws.map((flaw) => ({
      name: flaw.id,
      question: question(flaw.when),
      detail: `when ${flaw.when}${flaw.signals?.length ? ` · ${flaw.signals.length} regex` : ""}`,
      status: (score.visibleFlaws.includes(flaw.id) ? "showed" : score.missedFlaws.includes(flaw.id) ? "gap" : "pass") as Status,
    })),
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.name} className="flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5">
            <span aria-hidden="true" className={`mt-px font-mono text-xs font-black ${STATUS_MARK[row.status].color}`}>
              {STATUS_MARK[row.status].mark}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs leading-snug font-bold text-white">{row.question}</span>
              <span className="block truncate font-mono text-[10px] text-brand-300">
                {row.name} · {row.detail}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-black ${STATUS_MARK[row.status].pill}`}>{t.hood.status[row.status]}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
        <span className="text-xs font-bold text-brand-200">{t.hood.scored}</span>
        <span className="text-base tracking-widest text-amber-300" aria-label={t.common.starsOf(score.stars)}>
          {"★".repeat(score.stars)}
          <span className="text-white/20">{"★".repeat(3 - score.stars)}</span>
        </span>
      </div>
    </div>
  );
}

type Status = "pass" | "gap" | "showed";
const STATUS_MARK: Record<Status, { mark: string; color: string; pill: string }> = {
  pass: { mark: "✓", color: "text-emerald-300", pill: "bg-emerald-300/15 text-emerald-200" },
  gap: { mark: "!", color: "text-amber-300", pill: "bg-amber-300/15 text-amber-200" },
  showed: { mark: "✗", color: "text-[#ff8fa8]", pill: "bg-[#ff6b8b]/15 text-[#ffb3c4]" },
};

/** JSON with keys, strings, numbers and null in their own colors. */
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function Json({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2) ?? "null";
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [whole, str, colon, word] = match;
    const color = str ? (colon ? "text-brand-300" : "text-emerald-200") : word ? "text-[#ff9fb6]" : "text-amber-200";
    parts.push(
      <span key={key++} className={color}>
        {str ?? whole}
      </span>,
    );
    if (colon) parts.push(colon);
    last = index + whole.length;
  }
  parts.push(text.slice(last));
  return (
    <pre className="max-h-80 overflow-auto rounded-xl bg-black/25 p-3 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-white/70 [scrollbar-color:rgb(140_125_251/0.5)_transparent] [scrollbar-width:thin]">
      {parts}
    </pre>
  );
}

type GlossaryKey = keyof Strings["hood"]["keys"];

/** "What's what": each field on screen, in plain words. */
function Glossary({ keys, t }: { keys: GlossaryKey[]; t: Strings }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <p className="mb-1.5 text-[11px] font-black tracking-wider text-brand-300 uppercase">{t.hood.keysTitle}</p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
        {keys.map((key) => (
          <Fragment key={key}>
            <dt className="font-mono font-bold text-brand-300">{key}</dt>
            <dd className="font-semibold text-brand-100">{t.hood.keys[key]}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

function requestKeys(call: CallRecord): GlossaryKey[] {
  const roles = new Set(call.request.messages.map((m) => m.role));
  return [
    "model",
    "messages",
    ...(["system", "user", "assistant"] as const).filter((role) => roles.has(role)),
    ...(call.request.tools?.length ? (["tools"] as const) : []),
  ];
}

function responseKeys(call: CallRecord): GlossaryKey[] {
  return [...(call.reply?.model ? (["model"] as const) : []), "latency_ms", "tool_calls", "content"];
}

/** What was sent, summed up: long messages are clipped so the shape of the payload stays readable. */
function requestView(call: CallRecord) {
  return {
    model: call.reply?.model ?? "muse-spark",
    messages: call.request.messages.map((m) => ({ role: m.role, content: clip(m.content, 140) })),
    ...(call.request.tools?.length ? { tools: call.request.tools.map(signature) } : {}),
  };
}

/** What came back: the exact tool calls with every argument, and any text. */
function responseView(call: CallRecord) {
  const reply = call.reply!;
  return {
    ...(reply.model ? { model: reply.model } : {}),
    latency_ms: call.ms,
    tool_calls: (reply.toolCalls ?? []).map((c) => ({ name: c.name, arguments: c.args })),
    content: reply.content,
  };
}

function signature(tool: ToolDefinition): string {
  const props = (tool.function.parameters as { properties?: Record<string, unknown> }).properties ?? {};
  return `${tool.function.name}(${Object.keys(props).join(", ")})`;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}… (+${text.length - max} chars)` : text;
}

function kindOf(mission: Mission, call: CallRecord): CallKind {
  const say = phrasesFor(mission);
  return callKind(call, say.nudge, say.approve);
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
