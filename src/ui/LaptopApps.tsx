// The screen of Pipo's laptop: Pipo Code, the coding agent the young coder uses. Pipo fills in a
// tool call (a website, a game level, a chart); we draw a live preview and a tidy code view from
// those arguments. Nothing Pipo writes is ever run: the "code" is our own rendering of its choices.
// `flags` follow the tool's answer lines, so the part that shows a gap is outlined in red.
import { useState } from "react";
import { readable } from "../engine/actions.ts";
import type { PipoAction } from "../engine/types.ts";

interface Props {
  action: PipoAction;
  flags: readonly boolean[];
}

const FLAG = "ring-2 ring-red-400 ring-offset-1";
const LAPTOP_APPS: readonly PipoAction["app"][] = ["site", "game", "chart"];

export const isLaptopApp = (app: PipoAction["app"]) => LAPTOP_APPS.includes(app);

const text = (v: unknown) => (typeof v === "string" ? v.trim() : readable(v));
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);
const named = (v: unknown) => {
  const o = (v ?? {}) as { name?: unknown };
  return o.name !== undefined ? readable(o.name) : readable(v);
};
const detail = (v: unknown) => {
  const o = (v ?? {}) as { value?: unknown; cost?: unknown; note?: unknown; price?: unknown };
  return o.value ?? o.cost ?? o.note ?? o.price;
};

export function LaptopScreen({ action, flags }: Props) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const { title, code } = describe(action);
  return (
    <div className="flex h-full flex-col bg-[#1b1640]">
      {/* Pipo Code's window bar */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] font-black text-white">⚡ Pipo Code</span>
        <span className="truncate text-[11px] font-bold text-white/60">· {title}</span>
        <span className="ml-auto flex rounded-lg bg-white/10 p-0.5" role="tablist">
          {(["preview", "code"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-black capitalize ${tab === t ? "bg-white text-ink" : "text-white/70 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-t-lg bg-white">
        {tab === "code" ? (
          <pre className="h-full overflow-auto bg-[#221c4f] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#e6e1ff]">{code}</pre>
        ) : (
          <Preview action={action} flags={flags} />
        )}
      </div>
    </div>
  );
}

function Preview({ action, flags }: Props) {
  const a = action.args;
  if (action.app === "site") return a.problem !== undefined ? <FixView action={action} flags={flags} /> : <SiteView action={action} flags={flags} />;
  if (action.app === "game") return a.items !== undefined ? <ShopView action={action} flags={flags} /> : <LevelView action={action} flags={flags} />;
  return a.steps !== undefined ? <DiagramView action={action} flags={flags} /> : <ChartView action={action} flags={flags} />;
}

/** A little web page in a browser frame. */
function SiteView({ action, flags }: Props) {
  const a = action.args;
  const live = action.outcome === "done";
  const art = /hamster|nugget/i.test(`${text(a.title)} ${text(a.intro)}`) ? "🐹" : "✨";
  const slug = text(a.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-site";
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500">
        <span aria-hidden="true">{live ? "🌐" : "🔒"}</span>
        <span className="truncate">{live ? `${slug}.pipo.site` : "Preview (only you can see this)"}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-amber-50 to-white p-3">
        <h3 className={`rounded-md px-1 text-center text-lg leading-tight font-black text-orange-600 ${flags[0] ? FLAG : ""}`}>{text(a.title)}</h3>
        <div className="mx-auto my-2 flex h-14 w-24 items-center justify-center rounded-2xl bg-orange-100 text-3xl" aria-hidden="true">
          {art}
        </div>
        <p className={`rounded-md px-1 text-center text-[12px] leading-snug font-semibold text-ink ${flags[1] ? FLAG : ""}`}>{text(a.intro)}</p>
        <div className={`mt-2 grid grid-cols-3 gap-1.5 rounded-md ${flags[2] ? FLAG : ""}`}>
          {list(a.sections).slice(0, 3).map((s, i) => (
            <div key={i} className="rounded-lg bg-white p-1.5 text-center text-[10px] font-bold text-gray-700 shadow-sm">
              {named(s)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A bug fix: what was wrong, and the change Pipo made. */
function FixView({ action, flags }: Props) {
  const a = action.args;
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3 text-[12px]">
      <div className={`rounded-xl bg-rose-50 p-2 ${flags[0] ? FLAG : ""}`}>
        <p className="text-[10px] font-black tracking-wide text-rose-600 uppercase">🐞 The bug</p>
        <p className="font-semibold text-ink">{text(a.problem)}</p>
      </div>
      <div className={`rounded-xl bg-emerald-50 p-2 ${flags[1] ? FLAG : ""}`}>
        <p className="text-[10px] font-black tracking-wide text-emerald-700 uppercase">🔧 The fix</p>
        <p className="font-semibold text-ink">{text(a.fix)}</p>
      </div>
      <p className={`rounded-md px-1 text-[11px] font-bold text-gray-500 ${flags[2] ? FLAG : ""}`}>📄 {text(a.page)}</p>
    </div>
  );
}

/** A blocky side-on level: platforms, obstacles, checkpoints and the goal. A little avatar hops along. */
function LevelView({ action, flags }: Props) {
  const a = action.args;
  const obstacles = list(a.obstacles).slice(0, 6);
  const checkpoints = Number.parseInt(String(a.checkpoints), 10);
  const cps = Number.isFinite(checkpoints) ? Math.min(Math.max(checkpoints, 0), 5) : 0;
  const n = Math.max(obstacles.length, 1);
  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-black text-ink ${flags[0] ? FLAG : ""}`}>
        <span>🧱 BlockStudio · {text(a.name)}</span>
        <span className="text-gray-500">{text(a.theme)}</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-sky-200 to-pink-100">
        <svg viewBox="0 0 300 120" className="h-full w-full" aria-label={`Level with ${obstacles.length} obstacles and ${cps} checkpoints`}>
          {obstacles.map((o, i) => {
            const x = 20 + (i * 260) / n;
            const y = 80 - (i % 2) * 18;
            const label = named(o).toLowerCase();
            const danger = /lava|kill|spike/.test(label);
            return (
              <g key={i}>
                <rect x={x} y={y} width={30} height={10} rx={3} fill={danger ? "#ff5a5a" : "#a78bfa"} />
                <text x={x + 15} y={y + 22} fontSize="7" textAnchor="middle" fill="#26233a" fontWeight="700">
                  {named(o).slice(0, 14)}
                </text>
              </g>
            );
          })}
          {Array.from({ length: cps }, (_, i) => {
            const x = 40 + ((i + 1) * 240) / (cps + 1);
            return (
              <g key={`cp${i}`}>
                <line x1={x} y1={50} x2={x} y2={72} stroke="#26233a" strokeWidth="1.5" />
                <path d={`M${x} 50 L${x + 10} 54 L${x} 58 Z`} fill="#34d399" />
              </g>
            );
          })}
          <text x={286} y={60} fontSize="16" textAnchor="middle">
            ⭐
          </text>
          <rect className="level-hopper" x={8} y={68} width={9} height={11} rx={2} fill="#ff7a1a" />
        </svg>
      </div>
      <div className="space-y-0.5 px-3 py-1.5 text-[11px] font-bold text-gray-700">
        <p className={`rounded px-1 ${flags[1] ? FLAG : ""}`}>🧱 {obstacles.map(named).join(", ") || "No obstacles"}</p>
        <p className={`rounded px-1 ${flags[2] ? FLAG : ""}`}>🚩 {cps} checkpoints</p>
        <p className={`rounded px-1 ${flags[3] ? FLAG : ""}`}>🏁 {text(a.goal)}</p>
      </div>
    </div>
  );
}

/** The in-game shop: items with prices, and what players pay with. */
function ShopView({ action, flags }: Props) {
  const a = action.args;
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-violet-50 to-white">
      <p className="px-3 py-1.5 text-[11px] font-black text-ink">🧱 BlockStudio · Shop</p>
      <ul className={`grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto px-3 py-1 ${flags[0] ? FLAG : ""}`}>
        {list(a.items).map((item, i) => (
          <li key={i} className="flex flex-col items-center rounded-xl bg-white p-2 text-center shadow-sm">
            <span className="text-2xl" aria-hidden="true">
              {i % 2 ? "🎩" : "🌈"}
            </span>
            <span className="text-[11px] font-black text-ink">{named(item)}</span>
            <span className="text-[11px] font-bold text-amber-600">🪙 {readable(detail(item) ?? "?")}</span>
          </li>
        ))}
      </ul>
      <p className={`mx-3 mb-2 rounded-md px-1 text-[11px] font-bold text-gray-600 ${flags[1] ? FLAG : ""}`}>Pay with: {text(a.currency)}</p>
    </div>
  );
}

const BAR_COLOURS = ["#ff8fb8", "#ffd166", "#8c7dfb", "#7cc8ff", "#6ee7b7", "#ffb36b"];

/** A bar chart drawn from Pipo's numbers. */
function ChartView({ action, flags }: Props) {
  const a = action.args;
  const bars = list(a.bars).map((b) => ({ name: named(b), value: Number(detail(b)) || 0 }));
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex h-full flex-col p-3">
      <p className={`rounded-md px-1 text-center text-[13px] font-black text-ink ${flags[0] ? FLAG : ""}`}>{text(a.title)}</p>
      <div className={`mt-2 flex min-h-0 flex-1 items-end justify-around gap-2 rounded-md border-b-2 border-gray-300 px-1 ${flags[1] ? FLAG : ""}`}>
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="text-[11px] font-black text-ink">{b.value}</span>
            <div className="w-full rounded-t-md" style={{ height: `${(b.value / max) * 75}%`, background: BAR_COLOURS[i % BAR_COLOURS.length] }} />
          </div>
        ))}
      </div>
      <div className="flex justify-around gap-2 pt-1">
        {bars.map((b, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] font-bold text-gray-600">
            {b.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A cycle diagram: steps round a circle with arrows between them. */
function DiagramView({ action, flags }: Props) {
  const a = action.args;
  const steps = list(a.steps).slice(0, 6);
  const n = Math.max(steps.length, 1);
  return (
    <div className="flex h-full flex-col p-2">
      <p className={`rounded-md px-1 text-center text-[13px] font-black text-ink ${flags[0] ? FLAG : ""}`}>{text(a.title)}</p>
      <svg viewBox="0 0 300 150" className={`min-h-0 flex-1 rounded-md ${flags[1] ? FLAG : ""}`} aria-label={`Diagram with ${steps.length} steps`}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#8c7dfb" />
          </marker>
        </defs>
        <ellipse cx="150" cy="78" rx="98" ry="52" fill="none" stroke="#d3cfff" strokeWidth="2" strokeDasharray="4 4" />
        {steps.map((s, i) => {
          const angle = -Math.PI / 2 + (i * Math.PI * 2) / n;
          const x = 150 + Math.cos(angle) * 98;
          const y = 78 + Math.sin(angle) * 52;
          const next = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / n;
          const note = detail(s);
          return (
            <g key={i}>
              <path
                d={`M${150 + Math.cos(next - 0.18) * 98} ${78 + Math.sin(next - 0.18) * 52} L${150 + Math.cos(next + 0.05) * 98} ${78 + Math.sin(next + 0.05) * 52}`}
                stroke="#8c7dfb"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <rect x={x - 46} y={y - 14} width={92} height={note === undefined ? 18 : 28} rx={9} fill="#ffffff" stroke="#b2a9ff" />
              <text x={x} y={y - 1} fontSize="9" textAnchor="middle" fontWeight="800" fill="#26233a">
                {named(s).slice(0, 18)}
              </text>
              {note !== undefined && (
                <text x={x} y={y + 10} fontSize="7" textAnchor="middle" fill="#6b6788">
                  {readable(note).slice(0, 26)}
                </text>
              )}
            </g>
          );
        })}
        <text x="150" y="84" fontSize="20" textAnchor="middle">
          💧
        </text>
      </svg>
    </div>
  );
}

/** The project name for the window bar, and a tidy code view of what Pipo built. */
function describe(action: PipoAction): { title: string; code: string } {
  const a = action.args;
  if (action.app === "site") {
    if (a.problem !== undefined) {
      return {
        title: text(a.page),
        code: `// 🐞 ${text(a.problem)}\n// 🔧 ${text(a.fix)}\n\nmoreButton.addEventListener("click", showMorePhotos);\n+ moreButton.addEventListener("touchend", showMorePhotos);`,
      };
    }
    const sections = list(a.sections).map((s) => `  <section>${named(s)}</section>`).join("\n");
    return { title: text(a.title), code: `<h1>${text(a.title)}</h1>\n<img src="nugget.jpg" alt="Nugget the hamster">\n<p>${text(a.intro)}</p>\n<main>\n${sections}\n</main>` };
  }
  if (action.app === "game") {
    if (a.items !== undefined) {
      const items = list(a.items).map((i) => `  { name = "${named(i)}", price = ${readable(detail(i) ?? 0)} },`).join("\n");
      return { title: "Shop", code: `-- BlockStudio shop\nlocal shop = {\n${items}\n}\nshop.currency = "${text(a.currency)}"` };
    }
    const obstacles = list(a.obstacles).map((o) => `level:add("${named(o)}")`).join("\n");
    return {
      title: text(a.name),
      code: `-- BlockStudio level: ${text(a.name)}\nlocal level = Level.new("${text(a.theme)}")\n${obstacles}\nlevel:checkpoints(${readable(a.checkpoints)})\nlevel:goal("${text(a.goal)}")`,
    };
  }
  if (a.steps !== undefined) {
    const steps = list(a.steps).map((s, i) => `diagram.step(${i + 1}, "${named(s)}")`).join("\n");
    return { title: text(a.title), code: `diagram = Cycle("${text(a.title)}")\n${steps}\ndiagram.arrows("round")` };
  }
  const bars = list(a.bars).map((b) => `chart.bar("${named(b)}", ${readable(detail(b) ?? 0)})`).join("\n");
  return { title: text(a.title), code: `chart = BarChart("${text(a.title)}")\n${bars}` };
}
