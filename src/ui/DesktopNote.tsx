// A friendly heads-up on phones and tablets: Pipodojo is best on a computer, but you can still
// play. Shown once per device (dismissing it is remembered when storage allows).
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useLang } from "../i18n/index.tsx";

const KEY = "pipodojo.desktop-note";

function shouldShow(): boolean {
  if (!window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) return false;
  try {
    return localStorage.getItem(KEY) !== "seen";
  } catch {
    return true;
  }
}

export function DesktopNote() {
  const [open, setOpen] = useState(shouldShow);
  const still = useReducedMotion();
  const { t } = useLang();
  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "seen");
    } catch {
      // Not remembered this time; that's fine.
    }
  };

  return (
    <motion.div
      role="status"
      initial={still ? false : { opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink/90 px-4 py-3 text-white shadow-xl backdrop-blur"
    >
      <span className="text-2xl" aria-hidden="true">
        💻
      </span>
      <p className="flex-1 text-sm leading-snug font-bold">
        {t.desktopNote.title} <span className="font-semibold text-white/75">{t.desktopNote.sub}</span>
      </p>
      <button type="button" onClick={dismiss} className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-ink">
        {t.desktopNote.ok}
      </button>
    </motion.div>
  );
}
