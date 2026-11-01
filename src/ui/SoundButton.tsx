// The sound button: 🔊 (or 🔇 when everything is off). It opens a small panel with two switches,
// music and sound effects, each remembered on this device. The panel is drawn on top of the whole
// page (in a portal, placed under the button), so cards and headers can never cover it.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { getSoundSettings, play, setSoundSettings, subscribeSound, type SoundSettings } from "../app/sound.ts";
import { useLang } from "../i18n/index.tsx";

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribeSound, getSoundSettings, getSoundSettings);
}

const PANEL_WIDTH = 208;

export function SoundButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useLang();
  const settings = useSoundSettings();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState({ top: 0, left: 0 });
  const muted = !settings.music && !settings.sfx;

  // Under the button, right edges lined up, kept on screen.
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      setAt({ top: r.bottom + 8, left: Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Close on a tap outside or Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const flip = (key: keyof SoundSettings) => {
    setSoundSettings({ [key]: !settings[key] });
    play("toggle");
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t.sound.button}
        aria-expanded={open}
        title={t.sound.button}
        className={`flex shrink-0 items-center justify-center rounded-full font-black text-brand-700 transition hover:bg-white/80 active:translate-y-px focus-visible:outline-3 focus-visible:outline-brand-500 ${
          compact ? "h-9 w-9 text-lg" : "glass px-3 py-2 text-sm"
        } ${className}`}
      >
        <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="group"
            aria-label={t.sound.button}
            style={{ top: at.top, left: at.left, width: PANEL_WIDTH }}
            className="pop-in fixed z-[10050] space-y-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-brand-100"
          >
            <Switch label={`🎵 ${t.sound.music}`} on={settings.music} onFlip={() => flip("music")} onText={t.sound.on} offText={t.sound.off} />
            <Switch label={`🔔 ${t.sound.effects}`} on={settings.sfx} onFlip={() => flip("sfx")} onText={t.sound.on} offText={t.sound.off} />
          </div>,
          document.body,
        )}
    </>
  );
}

function Switch({ label, on, onFlip, onText, offText }: { label: string; on: boolean; onFlip: () => void; onText: string; offText: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label.replace(/^\S+\s/, "")}
      onClick={onFlip}
      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-extrabold text-ink hover:bg-brand-50"
    >
      <span>{label}</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${on ? "bg-brand-600" : "bg-gray-300"}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${on ? "translate-x-5" : ""}`} />
        <span className="sr-only">{on ? onText : offText}</span>
      </span>
    </button>
  );
}
