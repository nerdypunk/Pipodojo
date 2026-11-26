// On phones the town reads like an app: a tab bar along the bottom (like Twitter's) instead of a
// grid of small buttons in the header. You (your streak and stars), today's ranking, the language
// and the sound. Wider screens keep the header buttons, so this only shows below `sm`.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { play } from "../../app/sound.ts";
import { useLang } from "../../i18n/index.tsx";
import { LangSwitch } from "../LangSwitch.tsx";
import { Pipo } from "../Pipo.tsx";
import { SoundButton } from "../SoundButton.tsx";
import { useCloseOnOutside } from "../useCloseOnOutside.ts";

/** One tab: an icon over a short label, the full width of its quarter. */
const TAB =
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] leading-none font-extrabold text-ink transition active:scale-95 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-500 motion-reduce:transition-none";

interface Props {
  streak: number;
  stars: number;
  pathsDone: number;
  onRanking: () => void;
}

export function PhoneTabBar({ streak, stars, pathsDone, onRanking }: Props) {
  const { t } = useLang();
  const [showMe, setShowMe] = useState(false);
  return (
    <>
      <nav
        aria-label={t.town.tabs}
        className="fixed inset-x-0 bottom-0 z-[46] flex h-[calc(4rem+env(safe-area-inset-bottom))] items-start gap-1 border-t border-brand-100 bg-white/95 px-2 pt-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(45_36_112/0.35)] sm:hidden"
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={showMe}
          data-me-toggle=""
          onClick={() => {
            play("tap");
            setShowMe((open) => !open);
          }}
          className={`${TAB} ${showMe ? "text-brand-600" : ""}`}
        >
          <UserIcon />
          {t.town.tabYou}
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          data-board-toggle=""
          onClick={() => {
            play("tap");
            onRanking();
          }}
          className={TAB}
        >
          <TrophyIcon />
          {t.town.tabRanking}
        </button>
        <LangSwitch tab={<GlobeIcon />} className={TAB} />
        <SoundButton tab={t.town.tabSound} className={TAB} />
      </nav>
      {showMe && <MeSheet streak={streak} stars={stars} pathsDone={pathsDone} onClose={() => setShowMe(false)} />}
    </>
  );
}

/** Your progress on this device, in a card just above the tab bar. */
function MeSheet({ streak, stars, pathsDone, onClose }: Omit<Props, "onRanking"> & { onClose: () => void }) {
  const { t } = useLang();
  const close = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useCloseOnOutside(panel, onClose, "[data-me-toggle]");
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tiles = [
    { icon: "🔥", value: streak, label: t.town.streak },
    { icon: "★", value: stars, label: t.town.stars },
    { icon: "🏅", value: pathsDone, label: t.town.mePaths },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-[55]">
      <section
        ref={panel}
        role="dialog"
        aria-labelledby="me-title"
        className="pop-in pointer-events-auto absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-w-sm rounded-3xl bg-white/95 p-4 shadow-2xl ring-1 ring-white"
      >
        <div className="flex items-center gap-3">
          <Pipo mood="happy" className="h-12 w-12 shrink-0" />
          <h2 id="me-title" className="flex-1 text-lg font-black text-ink">
            {t.town.meTitle}
          </h2>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-black text-brand-700 hover:bg-brand-100 focus-visible:outline-3 focus-visible:outline-brand-500"
          >
            ×
          </button>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {tiles.map((tile) => (
            <li key={tile.label} className="flex flex-col items-center rounded-2xl bg-brand-50 px-1 py-2.5 text-center">
              <span className={`text-xl leading-none ${tile.icon === "★" ? "text-amber-400" : ""}`} aria-hidden="true">
                {tile.icon}
              </span>
              <span className="mt-1 text-2xl leading-none font-black text-ink">{tile.value}</span>
              <span className="mt-0.5 text-[11px] leading-tight font-bold text-gray-600">{tile.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[11px] font-semibold text-gray-500">{t.town.meNote}</p>
      </section>
    </div>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </Icon>
  );
}

function TrophyIcon() {
  return (
    <Icon>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M9 21h6M10 17h4" />
    </Icon>
  );
}

function GlobeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </Icon>
  );
}
