// The "year you were born" picker on the waitlist form, in Pipodojo's style instead of the browser's
// dropdown: a field that opens a small dark panel with a scrollable grid of year chips, from this
// year back a hundred, newest first. Every year is offered, so the question gives no hint of an age
// cutoff (COPPA). Typing a year jumps to it ("1987"), arrow keys move between the chips, Enter picks,
// Escape closes, and focus always comes back to the field.
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { play } from "../../app/sound.ts";
import { useLang } from "../../i18n/index.tsx";

const YEARS = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i);
/** Chips per row in the panel (arrow up and down move by this much). */
const COLS = 4;

interface Props {
  value: number | null;
  onChange: (year: number) => void;
  /** Shown amber when the form was sent without a year. */
  invalid?: boolean;
  className?: string;
}

export function YearPicker({ value, onChange, invalid = false, className = "" }: Props) {
  const { t } = useLang();
  const w = t.landing.waitlist;
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // Digits typed while the panel is open, to jump to a year.
  const typed = useRef({ text: "", at: 0 });

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) field.current?.focus();
  };

  // Opening focuses the chosen year (scrolled into view), or the first one.
  useEffect(() => {
    if (!open) return;
    const chip = panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? panel.current?.querySelector<HTMLButtonElement>("[data-chip]");
    chip?.focus();
    chip?.scrollIntoView({ block: "center" });
  }, [open]);

  // A tap outside closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const chips = () => [...(panel.current?.querySelectorAll<HTMLButtonElement>("[data-chip]") ?? [])];
  const focusChip = (chip: HTMLButtonElement | undefined) => {
    chip?.focus();
    chip?.scrollIntoView({ block: "nearest" });
  };

  /** Arrow keys walk the grid, digits jump to a year, Escape closes. */
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    const all = chips();
    if (/^\d$/.test(e.key)) {
      const now = performance.now();
      typed.current = { text: (now - typed.current.at < 1200 ? typed.current.text : "") + e.key, at: now };
      const match = all.find((c) => c.textContent?.startsWith(typed.current.text));
      if (match) focusChip(match);
      return;
    }
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS, Home: -at, End: all.length - 1 - at }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    focusChip(all[Math.max(0, Math.min(all.length - 1, at + step))]);
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button
        ref={field}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-invalid={invalid}
        onClick={() => {
          play("tap");
          setOpen((o) => !o);
        }}
        className={`flex h-12 w-full items-center justify-between gap-2 rounded-2xl bg-white/10 px-4 text-left font-bold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
          invalid ? "ring-amber-300/80" : "ring-white/20"
        } ${value ? "text-white" : "text-brand-200/70"}`}
      >
        <span className="truncate">
          <span className="sr-only">{w.birthYear}: </span>
          {value ?? w.birthYear}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={panel}
          id={`${id}-panel`}
          role="dialog"
          aria-label={w.birthYear}
          onKeyDown={keys}
          className="pop-in absolute top-full left-0 z-40 mt-2 w-full min-w-64 rounded-2xl bg-[#231c52] p-2 text-left shadow-[0_24px_48px_-16px_rgb(0_0_0/0.8)] ring-1 ring-white/15 sm:w-72"
        >
          <p className="px-2 pt-1 pb-2 text-sm font-extrabold text-brand-100">{w.birthYear}</p>
          {/* The years scroll inside the panel, with a thin violet scrollbar. */}
          <div className="grid max-h-60 grid-cols-4 gap-1.5 overflow-y-auto overscroll-contain p-1 [scrollbar-color:rgb(140_125_251/0.6)_transparent] [scrollbar-width:thin]">
            {YEARS.map((year) => {
              const chosen = value === year;
              return (
                <button
                  key={year}
                  type="button"
                  data-chip=""
                  aria-pressed={chosen}
                  onClick={() => {
                    play("pick");
                    onChange(year);
                    close();
                  }}
                  className={`rounded-xl py-2 text-sm font-extrabold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-brand-300 motion-reduce:transition-none ${
                    chosen ? "bg-brand-500 text-white shadow-[0_6px_16px_-6px_rgb(110_92_242/0.9)]" : "bg-white/5 text-brand-100 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
