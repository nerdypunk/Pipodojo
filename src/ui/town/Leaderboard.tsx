// The leaderboard: countries ranked by the stars their players earned, today or all time (two
// tabs), opened from the 🏆 button in town. Countries only (no names, no accounts, no cookies); the player's own country
// is highlighted, and shown under the top ten if it isn't in it.
import { useEffect, useRef, useState } from "react";
import { fetchLeaderboard, type CountryRow, type Leaderboard as Board } from "../../app/leaderboard.ts";
import { countryName, flagOf } from "../../game/countries.ts";
import { useLang } from "../../i18n/index.tsx";

const TOP = 10;
const MEDALS = ["🥇", "🥈", "🥉"];
const TABS = ["today", "allTime"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  onClose: () => void;
}

export function Leaderboard({ onClose }: Props) {
  const { t, lang } = useLang();
  const [board, setBoard] = useState<Board | null | "loading">("loading");
  const [tab, setTab] = useState<Tab>("today");
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    void fetchLeaderboard().then((b) => live && setBoard(b));
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      live = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const ready = board !== "loading" && board !== null ? board : null;
  const you = ready?.you ?? null;
  const rows = ready ? (tab === "today" ? ready.countries : ready.allTime) : [];
  const yourRank = you ? rows.findIndex((row) => row.country === you) : -1;
  const empty = tab === "today" ? t.town.leaderboardEmpty : t.town.leaderboardEmptyAll;

  return (
    <div className="fixed inset-0 z-[55]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
        onClick={(e) => e.stopPropagation()}
        className="pop-in absolute inset-x-3 top-20 mx-auto max-w-sm rounded-3xl bg-white/95 p-4 shadow-2xl ring-1 ring-white sm:inset-x-auto sm:right-6 sm:w-80 md:top-24"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="leaderboard-title" className="text-lg font-black text-ink">
              🏆 {t.town.leaderboard}
            </h2>
            <p className="text-xs font-semibold text-gray-600">{tab === "today" ? t.town.leaderboardSub : t.town.leaderboardSubAll}</p>
          </div>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label={t.town.leaderboardClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-black text-brand-700 hover:bg-brand-100 focus-visible:outline-3 focus-visible:outline-brand-500"
          >
            ×
          </button>
        </div>

        <div role="group" aria-label={t.town.leaderboardTabs} className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-brand-50 p-1">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-full py-1.5 text-sm font-black transition-colors focus-visible:outline-3 focus-visible:outline-brand-500 ${
                tab === id ? "bg-brand-600 text-white shadow" : "text-brand-700 hover:bg-brand-100"
              }`}
            >
              {id === "today" ? t.town.leaderboardToday : t.town.leaderboardAllTime}
            </button>
          ))}
        </div>

        <div className="mt-3" aria-live="polite">
          {board === "loading" && <p className="py-4 text-center text-sm font-bold text-gray-600">{t.town.leaderboardLoading}</p>}
          {board === null && <p className="py-4 text-center text-sm font-bold text-gray-600">{t.town.leaderboardOff}</p>}
          {ready && rows.length === 0 && (
            <p className="py-4 text-center text-sm font-bold text-gray-600">{empty(you ? `${flagOf(you)} ${countryName(you, lang)}` : "🌎")}</p>
          )}
          {ready && rows.length > 0 && (
            <ol className="space-y-1.5">
              {rows.slice(0, TOP).map((row, i) => (
                <Row key={row.country} row={row} rank={i} mine={row.country === you} lang={lang} lessons={t.town.leaderboardLessons} />
              ))}
              {yourRank >= TOP && (
                <>
                  <li aria-hidden="true" className="text-center text-xs font-black text-gray-400">
                    ⋯
                  </li>
                  <Row row={rows[yourRank]!} rank={yourRank} mine lang={lang} lessons={t.town.leaderboardLessons} />
                </>
              )}
            </ol>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] font-semibold text-gray-500">{t.town.leaderboardPrivacy}</p>
      </section>
    </div>
  );
}

function Row({ row, rank, mine, lang, lessons }: { row: CountryRow; rank: number; mine: boolean; lang: string; lessons: (n: number) => string }) {
  const { t } = useLang();
  return (
    <li
      className={`flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-sm ${mine ? "bg-brand-50 ring-2 ring-brand-400" : "bg-white ring-1 ring-brand-100"}`}
      aria-current={mine ? "true" : undefined}
    >
      <span className="w-7 shrink-0 text-center font-black text-brand-700">{MEDALS[rank] ?? rank + 1}</span>
      <span className="text-xl leading-none" aria-hidden="true">
        {flagOf(row.country)}
      </span>
      <span className="min-w-0 flex-1 truncate font-extrabold text-ink">
        {countryName(row.country, lang)}
        {mine && <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">{t.town.leaderboardYou}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-black text-ink">
          <span className="text-amber-500" aria-hidden="true">
            ★
          </span>{" "}
          {row.stars}
        </span>
        <span className="block text-[10px] font-bold text-gray-500">{lessons(row.lessons)}</span>
      </span>
    </li>
  );
}
