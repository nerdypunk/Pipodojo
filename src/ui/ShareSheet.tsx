// "Share your win": shows the end-of-path card, then shares it with the phone's share menu
// (Instagram, WhatsApp, Messages…), saves it as an image, or copies a short brag to paste.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { drawShareCard, type ShareInfo } from "./shareCard.ts";
import { useLang } from "../i18n/index.tsx";

interface Props {
  open: boolean;
  /** Everything for the card. `postcard` is null while Muse Image is still painting. */
  info: Omit<ShareInfo, "site" | "words">;
  painting: boolean;
  onClose: () => void;
}

const site = () => (/^(localhost|127\.|\[::1\])/.test(window.location.hostname) ? "Pipodojo" : window.location.host);

export function ShareSheet({ open, info, painting, onClose }: Props) {
  const still = useReducedMotion();
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const { lang, t } = useLang();
  const text = t.share.caption(info.brag, site() === "Pipodojo" ? "" : window.location.origin);

  // Draw the card when the sheet opens (and again once the postcard is ready).
  useEffect(() => {
    if (!open || painting) return;
    let cancelled = false;
    let url = "";
    void drawShareCard({ ...info, site: site(), words: t.card }).then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setCard({ blob, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // The info object is rebuilt on each render; its contents only change with these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, painting, info.postcard, info.streak, info.stars, lang]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const file = card ? new File([card.blob], t.share.fileName, { type: "image/jpeg" }) : null;
  const canShareFile = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "Pipodojo", text });
    } catch {
      // Closed the share menu: nothing to do.
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setNote(t.share.copied);
    } catch {
      setNote(t.share.cantCopy);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t.share.dialog}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10020] flex items-center justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={still ? false : { scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-black text-ink">{t.share.title}</p>
              <button type="button" onClick={onClose} aria-label={t.common.close} className="rounded-full px-2 text-xl font-black text-gray-500 hover:bg-gray-100">
                ×
              </button>
            </div>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-brand-100">
              {card ? (
                <img src={card.url} alt={t.share.cardAlt(info.brag)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <span className="text-4xl" aria-hidden="true">
                    🎨
                  </span>
                  <p className="px-6 text-sm font-extrabold text-brand-800">
                    {painting ? t.share.painting : t.share.making}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {canShareFile && (
                <button type="button" onClick={() => void share()} className="rounded-2xl bg-brand-600 py-3 text-base font-black text-white hover:bg-brand-700">
                  {t.share.share}
                </button>
              )}
              <div className="flex gap-2">
                <a
                  href={card?.url}
                  download={t.share.fileName}
                  aria-disabled={!card}
                  className={`flex-1 rounded-2xl py-2.5 text-center text-sm font-extrabold ${
                    canShareFile ? "border-2 border-gray-200 text-ink" : "bg-brand-600 text-white"
                  } ${card ? "" : "pointer-events-none opacity-50"}`}
                >
                  {t.share.save}
                </a>
                <button type="button" onClick={() => void copy()} className="flex-1 rounded-2xl border-2 border-gray-200 py-2.5 text-sm font-extrabold text-ink hover:bg-gray-50">
                  {t.share.copy}
                </button>
              </div>
              <p className="min-h-5 text-center text-xs font-bold text-gray-500" aria-live="polite">
                {note ?? t.share.hint}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
