// Donations: a "Support Pipodojo" button that opens Ko-fi's donation panel in a window over the
// page, so people can give without leaving. Nothing from Ko-fi loads until someone opens it:
// players who never tap it get no Ko-fi code and no cookies. The money goes to Pipodojo's Ko-fi page.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { play } from "../app/sound.ts";
import { useLang } from "../i18n/index.tsx";
import { Pipo } from "./Pipo.tsx";

export const KOFI_URL = "https://ko-fi.com/pipodojo";
/** Ko-fi's own embeddable donation panel for the page. */
const PANEL_URL = `${KOFI_URL}/?hidefeed=true&widget=true&embed=true&preview=true`;

/** Opens the donation window. Styled by the caller; the label defaults to "☕ Support Pipodojo". */
export function SupportButton({ className = "", children }: { className?: string; children?: ReactNode }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          play("tap");
          setOpen(true);
        }}
        className={className}
      >
        {children ?? (
          <>
            <span aria-hidden="true">☕ </span>
            {t.support.button}
          </>
        )}
      </button>
      {open && <SupportDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SupportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState(false);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // On the page itself, above everything (the lesson complete box sits at z-10000).
  return createPortal(
    <div className="fixed inset-0 z-[10100] flex bg-ink/45 p-3" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        onClick={(e) => e.stopPropagation()}
        className="pop-in m-auto flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]"
      >
        <div className="flex items-center gap-3 bg-[linear-gradient(115deg,#4936bd_0%,#5a46e0_45%,#8c7dfb_100%)] px-4 py-3 text-white">
          <Pipo mood="happy" className="h-12 w-12 shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]" />
          <div className="min-w-0 flex-1">
            <h2 id="support-title" className="text-lg leading-tight font-black">
              {t.support.title}
            </h2>
            <p className="text-sm leading-snug font-semibold text-white/85">{t.support.sub}</p>
          </div>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full bg-white/20 text-lg font-black text-white hover:bg-white/30 focus-visible:outline-3 focus-visible:outline-white"
          >
            ×
          </button>
        </div>

        <div className="relative h-[min(560px,calc(100dvh-15rem))] min-h-72 bg-[#f9f9f9]">
          {!loaded && (
            <p className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-500" aria-live="polite">
              {t.support.loading}
            </p>
          )}
          <iframe
            src={PANEL_URL}
            title={t.support.panel}
            allow="payment"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full border-0 transition-opacity motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>

        <div className="space-y-1 px-4 py-3 text-center">
          {/* Some phones won't finish a payment inside a frame: the full page always works. */}
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-extrabold text-brand-700 underline underline-offset-2 hover:text-brand-900"
          >
            {t.support.backup} ↗
          </a>
          <p className="text-[11px] font-semibold text-gray-500">{t.support.privacy}</p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
