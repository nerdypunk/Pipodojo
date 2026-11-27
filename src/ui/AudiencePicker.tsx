// Right after "Go to the playground": a kid or a grown-up? Kids get the sunny island; grown-ups get
// the night city with longer lessons. Only remembered on this device (as a convenience), never sent anywhere.
import { motion, useReducedMotion } from "motion/react";
import type { Audience } from "../game/personas.ts";
import { useLang } from "../i18n/index.tsx";
import { play } from "../app/sound.ts";
import { useGoHome } from "./HomeLink.tsx";
import { Glyph } from "./Glyph.tsx";
import { LangSwitch } from "./LangSwitch.tsx";
import { Pipo } from "./Pipo.tsx";
import { SoundButton } from "./SoundButton.tsx";

interface Props {
  /** The last choice on this device, shown as picked. */
  current: Audience | null;
  onPick: (audience: Audience) => void;
}

/** A few fixed stars for the night card (percent positions and size), the same every visit. */
const STARS: readonly [number, number, number][] = [
  [8, 14, 2], [22, 30, 1.5], [35, 9, 1], [58, 18, 2], [70, 8, 1.5], [86, 24, 1], [92, 12, 2], [14, 46, 1], [80, 42, 1.5],
];

export function AudiencePicker({ current, onPick }: Props) {
  const { t } = useLang();
  const still = useReducedMotion();
  const goHome = useGoHome();
  const pick = (audience: Audience) => {
    play("pick");
    onPick(audience);
  };
  const enter = (i: number) =>
    still ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 + i * 0.08, duration: 0.35 } };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center gap-4 p-3 md:px-6 md:py-6">
      <header className="glass flex items-center gap-3 rounded-2xl py-1.5 pr-4 pl-1.5">
        {goHome && (
          <button
            type="button"
            onClick={() => {
              play("tap");
              goHome();
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border-b-4 border-brand-800 bg-brand-600 py-1.5 pr-3 pl-2 text-sm font-black whitespace-nowrap text-white transition hover:bg-brand-700 active:translate-y-0.5 active:border-b-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none md:text-base"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ‹
            </span>
            {t.builder.home}
          </button>
        )}
        <span className="hidden text-lg font-black tracking-tight text-brand-700 sm:inline">Pipodojo</span>
        <LangSwitch className="ml-auto py-1.5" />
        <SoundButton compact />
      </header>

      <motion.div {...enter(0)} className="glass rounded-3xl px-5 py-4 text-center md:py-5">
        <p className="text-xs font-extrabold tracking-wide text-brand-700 uppercase">{t.audience.eyebrow}</p>
        <h1 className="text-2xl font-black text-ink md:text-4xl">{t.audience.title}</h1>
        <p className="mt-1 text-sm font-semibold text-gray-600 md:text-base">{t.audience.lead}</p>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {/* Kids: daylight, the island's sky and grass. */}
        <motion.button
          {...enter(1)}
          type="button"
          onClick={() => pick("kid")}
          aria-pressed={current === "kid"}
          className={`group relative flex flex-col overflow-hidden rounded-3xl border-b-[6px] text-left shadow-[0_18px_40px_-20px_rgb(45_36_112/0.6)] transition-transform hover:-translate-y-1 active:translate-y-0.5 active:border-b-2 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-500 motion-reduce:transition-none ${
            current === "kid" ? "border-brand-800 ring-4 ring-brand-500" : "border-sky-700/40"
          }`}
        >
          <div className="relative flex h-40 items-end justify-center bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200 max-sm:h-28 md:h-52">
            <Glyph e="☀" className="absolute top-4 right-6 text-4xl text-amber-400 drop-shadow-[0_0_14px_rgb(251_191_36/0.8)] md:text-5xl" strokeWidth={2.5} />
            <span className="absolute top-8 left-6 h-6 w-16 rounded-full bg-white/80" aria-hidden="true" />
            <span className="absolute top-14 left-16 h-5 w-12 rounded-full bg-white/70" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 h-10 rounded-t-[50%] bg-emerald-400/80" aria-hidden="true" />
            <Pipo mood="happy" className="relative mb-2 h-28 w-28 max-sm:h-20 max-sm:w-20 transition-transform group-hover:scale-105 motion-reduce:transition-none md:h-36 md:w-36" />
          </div>
          <div className="flex flex-1 flex-col gap-1 bg-white px-5 py-4 max-sm:py-3">
            <span className="text-xl font-black text-ink md:text-2xl">{t.audience.kid.title}</span>
            <span className="text-sm font-semibold text-gray-600 md:text-base">{t.audience.kid.text}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-black text-brand-700">
              {t.audience.go} <span aria-hidden="true">›</span>
            </span>
          </div>
        </motion.button>

        {/* Grown-ups: the night city, in neon magenta and cyan on deep indigo. */}
        <motion.button
          {...enter(2)}
          type="button"
          onClick={() => pick("grownup")}
          aria-pressed={current === "grownup"}
          className={`group relative flex flex-col overflow-hidden rounded-3xl border-b-[6px] text-left shadow-[0_18px_40px_-16px_rgb(20_12_60/0.9)] transition-transform hover:-translate-y-1 active:translate-y-0.5 active:border-b-2 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-fuchsia-400 motion-reduce:transition-none ${
            current === "grownup" ? "border-fuchsia-500 ring-4 ring-fuchsia-400" : "border-[#0b0a24]"
          }`}
        >
          <div className="relative flex h-40 items-end justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_70%_0%,#3a2a8c_0%,#171445_55%,#0b0a24_100%)] max-sm:h-28 md:h-52">
            {STARS.map(([x, y, s], i) => (
              <span
                key={i}
                className="twinkle absolute rounded-full bg-white"
                style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${i * 0.4}s` }}
                aria-hidden="true"
              />
            ))}
            <span className="absolute top-4 right-6 h-10 w-10 rounded-full bg-[#fff4d6] shadow-[0_0_30px_8px_rgb(255_240_200/0.35)] md:h-12 md:w-12" aria-hidden="true" />
            {/* A little skyline with lit windows and two neon strips. */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1.5 px-4" aria-hidden="true">
              <Tower h="h-20" w="w-12" />
              <Tower h="h-28" w="w-10" neon="bg-fuchsia-400 shadow-[0_0_12px_3px_rgb(232_121_249/0.8)]" />
              <span className="w-28 md:w-36" />
              <Tower h="h-24" w="w-14" neon="bg-cyan-300 shadow-[0_0_12px_3px_rgb(103_232_249/0.8)]" />
              <Tower h="h-16" w="w-10" />
            </div>
            <Pipo mood="happy" className="relative mb-2 h-28 w-28 max-sm:h-20 max-sm:w-20 drop-shadow-[0_0_18px_rgb(232_121_249/0.45)] transition-transform group-hover:scale-105 motion-reduce:transition-none md:h-36 md:w-36" />
          </div>
          <div className="flex flex-1 flex-col gap-1 bg-[#14123a] px-5 py-4 max-sm:py-3">
            <span className="text-xl font-black text-white md:text-2xl">{t.audience.grownup.title}</span>
            <span className="text-sm font-semibold text-indigo-200 md:text-base">{t.audience.grownup.text}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-black text-fuchsia-300">
              {t.audience.go} <span aria-hidden="true">›</span>
            </span>
          </div>
        </motion.button>
      </div>
      <p className="text-center text-xs font-bold text-brand-800">{t.audience.note}</p>
    </div>
  );
}

function Tower({ h, w, neon }: { h: string; w: string; neon?: string }) {
  return (
    <span className={`relative ${h} ${w} rounded-t-md bg-[#262257]`}>
      <span className="absolute inset-x-2 top-3 grid grid-cols-2 gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-[2px] ${i % 3 === 1 ? "bg-white/15" : "bg-[#ffe9ff] shadow-[0_0_6px_rgb(255_200_255/0.8)]"}`} />
        ))}
      </span>
      {neon && <span className={`absolute top-2 -right-0.5 h-3/5 w-1 rounded-full ${neon}`} />}
    </span>
  );
}
