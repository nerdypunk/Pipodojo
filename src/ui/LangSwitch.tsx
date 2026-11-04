// The language switch: a small 🌐 pill showing the current language. It opens a short menu with
// every language, each written in its own words (English, Español, 日本語), so anyone can find
// theirs. Like the sound panel, the menu is drawn in a portal under the button (above it in the
// phone tab bar), so cards and headers can never cover it.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LANGS, useLang } from "../i18n/index.tsx";
import { play } from "../app/sound.ts";

const MENU_WIDTH = 176;

export function LangSwitch({
  className = "",
  tab,
}: {
  className?: string;
  /** In the phone tab bar: this icon over the current language's name, styled by className; the menu opens above. */
  tab?: ReactNode;
}) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0]!;

  // Under the button (above it in the tab bar), right edges lined up, kept on screen.
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
      setAt(tab ? { bottom: window.innerHeight - r.top + 8, left } : { top: r.bottom + 8, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, tab]);

  // Focus the current language when the menu opens; close on a tap outside or Escape.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const away = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => {
          play("tap");
          setOpen((o) => !o);
        }}
        aria-label={`${t.langMenu.label}: ${current.name}`}
        aria-haspopup="true"
        aria-expanded={open}
        title={t.langMenu.label}
        className={
          tab
            ? className
            : `chip flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black transition hover:bg-brand-700 active:translate-y-px focus-visible:outline-3 focus-visible:outline-brand-500 ${className}`
        }
      >
        {tab ? (
          <>
            {tab}
            <span lang={current.id}>{current.name}</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">🌐</span>
            {current.short}
          </>
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={t.langMenu.label}
            style={{ ...at, width: MENU_WIDTH }}
            className="pop-in fixed z-[10050] space-y-0.5 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-brand-100"
          >
            {LANGS.map((option) => {
              const on = option.id === lang;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  lang={option.id}
                  onClick={() => {
                    play("toggle");
                    setOpen(false);
                    if (!on) setLang(option.id);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-extrabold transition hover:bg-brand-50 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-500 ${
                    on ? "bg-brand-50 text-brand-700" : "text-ink"
                  }`}
                >
                  <span>{option.name}</span>
                  {on && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
