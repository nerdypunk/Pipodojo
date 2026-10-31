// "Make your Pipo": pick a head, a body and colours before heading into town (and any time
// later from Pipo's garage). Everything is drawn
// in code, so it's instant and free; the look also goes into the end-of-path postcard prompt.
import { motion, useReducedMotion } from "motion/react";
import { BODIES, COLORS, HEADS, paletteOf, type PipoLook } from "../game/pipoLook.ts";
import { useLang } from "../i18n/index.tsx";
import { Button } from "./Button.tsx";
import { LangSwitch } from "./LangSwitch.tsx";
import { Pipo } from "./Pipo.tsx";
import { ShaderBorder } from "./ShaderBorder.tsx";

interface Props {
  look: PipoLook;
  /** Takes an update so quick taps never undo each other. */
  onChange: (update: (look: PipoLook) => PipoLook) => void;
  /** Into town. `first` is the very first visit (the button says so). */
  onDone: () => void;
  first: boolean;
}

export function PipoBuilder({ look, onChange, onDone, first }: Props) {
  const still = useReducedMotion();
  const { lang, t } = useLang();
  const label = (option: { label: string; es: string }) => (lang === "es" ? option.es : option.label);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-3 p-3 md:px-6 md:py-4">
      <header className="glass flex items-center gap-3 rounded-2xl py-1.5 pr-4 pl-1.5">
        <span className="pl-2.5 text-lg font-black tracking-tight text-brand-700">Pipodojo</span>
        <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-extrabold text-white">{first ? t.builder.welcome : t.builder.garage}</span>
        <span className="ml-auto hidden items-center gap-1.5 text-xs font-extrabold text-brand-800 sm:inline-flex">
          <span aria-hidden="true">⚡</span> {t.common.poweredBy}
        </span>
        <LangSwitch className="ml-auto py-1.5 sm:ml-0" />
      </header>

      <main className="grid gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-5">
        {/* Live preview */}
        <ShaderBorder mode="build" className="flex flex-col">
          <section className="glass flex flex-1 flex-col gap-3 rounded-3xl p-3 md:p-4" aria-label={t.builder.yourPipo}>
            <div className="relative flex min-h-56 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,#5a46e0_0%,#2d2470_55%,#1b1640_100%)]">
              <motion.div
                key={`${look.head}-${look.body}-${look.color}`}
                initial={still ? false : { scale: 0.85, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
              >
                <Pipo mood="happy" look={look} className="h-48 w-48 drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)] md:h-56 md:w-56" />
              </motion.div>
            </div>
            <div className="rounded-2xl bg-white/90 p-4">
              <p className="text-xs font-extrabold tracking-wide text-brand-700 uppercase">{first ? t.builder.meet : t.builder.newLook}</p>
              <h1 className="text-2xl font-black text-ink md:text-3xl">{t.builder.title}</h1>
              <p className="font-semibold text-gray-600">{t.builder.intro}</p>
            </div>
          </section>
        </ShaderBorder>

        {/* Choices */}
        <ShaderBorder mode="build" roundness={0.08} className="flex flex-col">
          <section className="glass flex flex-1 flex-col gap-4 rounded-3xl p-4 md:p-5" aria-label={t.builder.pickLook}>
            <Choice label={t.builder.head}>
              {HEADS.map((head) => (
                <Tile key={head.id} on={look.head === head.id} label={label(head)} onPick={() => onChange((l) => ({ ...l, head: head.id }))}>
                  <Pipo look={{ ...look, head: head.id }} className="h-14 w-14" />
                </Tile>
              ))}
            </Choice>
            <Choice label={t.builder.body}>
              {BODIES.map((body) => (
                <Tile key={body.id} on={look.body === body.id} label={label(body)} onPick={() => onChange((l) => ({ ...l, body: body.id }))}>
                  <Pipo look={{ ...look, body: body.id }} className="h-14 w-14" />
                </Tile>
              ))}
            </Choice>
            <Choice label={t.builder.colours}>
              {COLORS.map((color) => {
                const [light, mid, dark] = paletteOf(color.id).shell;
                return (
                  <Tile key={color.id} on={look.color === color.id} label={label(color)} onPick={() => onChange((l) => ({ ...l, color: color.id }))}>
                    <span
                      className="h-12 w-12 rounded-full shadow-inner ring-2 ring-white"
                      style={{ background: `linear-gradient(160deg, ${light}, ${mid} 55%, ${dark})` }}
                      aria-hidden="true"
                    />
                  </Tile>
                );
              })}
            </Choice>
            <div className="mt-auto flex gap-2 border-t border-white/70 pt-4">
              <Button className="flex-1" onClick={onDone}>
                {first ? t.builder.go : t.builder.back}
              </Button>
            </div>
          </section>
        </ShaderBorder>
      </main>
    </div>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-base font-extrabold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Tile({ on, label, onPick, children }: { on: boolean; label: string; onPick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={`flex w-24 flex-col items-center gap-1 rounded-2xl border-2 border-b-4 px-2 py-2 text-sm font-extrabold transition active:translate-y-px motion-reduce:transition-none ${
        on ? "pick-pop border-brand-700 bg-brand-600 text-white" : "border-white bg-white/85 text-ink hover:bg-white"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
