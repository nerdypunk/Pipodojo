// The sound button: 🔊 (or 🔇 when everything is off). It opens a small panel with two switches,
// music and sound effects, each remembered on this device.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSoundSettings, play, setSoundSettings, subscribeSound, type SoundSettings } from "../app/sound.ts";
import { useLang } from "../i18n/index.tsx";

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribeSound, getSoundSettings, getSoundSettings);
}

export function SoundButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useLang();
  const settings = useSoundSettings();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const muted = !settings.music && !settings.sfx;

  // Close on a tap outside or Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
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
    <div ref={box} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t.sound.button}
        aria-expanded={open}
        title={t.sound.button}
        className={`flex items-center justify-center rounded-full font-black text-brand-700 transition hover:bg-white/80 active:translate-y-px focus-visible:outline-3 focus-visible:outline-brand-500 ${
          compact ? "h-9 w-9 text-lg" : "glass px-3 py-2 text-sm"
        }`}
      >
        <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
      </button>
      {open && (
        <div
          role="group"
          aria-label={t.sound.button}
          className="pop-in absolute top-full right-0 z-50 mt-2 w-52 space-y-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-brand-100"
        >
          <Switch label={`🎵 ${t.sound.music}`} on={settings.music} onFlip={() => flip("music")} onText={t.sound.on} offText={t.sound.off} />
          <Switch label={`🔔 ${t.sound.effects}`} on={settings.sfx} onFlip={() => flip("sfx")} onText={t.sound.on} offText={t.sound.off} />
        </div>
      )}
    </div>
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
