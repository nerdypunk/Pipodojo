// The clue hunt's way of building the prompt: a long chat or email where the player taps the
// parts Pipo needs. Tapped parts get a highlighter mark and join the prompt as pieces.
import type { ClueHunt } from "../../game/clueHunts.ts";
import { useLang } from "../../i18n/index.tsx";
import { play } from "../../app/sound.ts";
import type { PickerProps } from "../MissionPlayer.tsx";

export function CluePicker({ hunt, picks, onTap, done }: PickerProps & { hunt: ClueHunt }) {
  const { t } = useLang();
  const { source } = hunt;
  const tapped = source.segments.filter((s) => s.piece && picks.includes(s.piece)).length;

  const body = (
    <p className="text-[15px] leading-relaxed font-semibold text-ink md:text-base">
      {source.segments.map((segment, i) => {
        if (!segment.piece) return <span key={i}>{segment.text}</span>;
        const on = picks.includes(segment.piece);
        return (
          <button
            key={i}
            type="button"
            disabled={done}
            aria-pressed={on}
            onClick={() => {
              play(on ? "unpick" : "pick");
              onTap(segment.piece!);
            }}
            className={`inline rounded-md px-0.5 text-left transition-colors [box-decoration-break:clone] motion-reduce:transition-none ${
              on
                ? "bg-amber-300/80 text-ink shadow-[inset_0_-2px_0_rgb(217_119_6/0.6)]"
                : done
                  ? ""
                  : "underline decoration-brand-300 decoration-dashed decoration-2 underline-offset-4 hover:bg-brand-100"
            }`}
          >
            {segment.text}
          </button>
        );
      })}
    </p>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-ink md:text-base">
          <span aria-hidden="true">🔍 </span>
          {t.lab.clueHint}
        </p>
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800" aria-live="polite">
          {t.lab.cluesPicked(tapped)}
        </span>
      </div>

      {source.kind === "chat" ? (
        <div className="overflow-hidden rounded-2xl bg-[#efeae2] shadow-sm">
          <p className="flex items-center gap-2 bg-emerald-700 px-3 py-2 text-sm font-black text-white">
            <span aria-hidden="true">💬</span>
            {source.from}
            <span className="ml-auto text-[11px] font-bold text-white/75">{t.lab.chat}</span>
          </p>
          <div className="p-3">
            <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm">{body}</div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-100">
          <div className="space-y-0.5 bg-sky-600 px-3 py-2 text-white">
            <p className="flex items-center gap-2 text-sm font-black">
              <span aria-hidden="true">✉️</span>
              {t.lab.email}
            </p>
            <p className="text-xs font-semibold text-white/85">
              {t.lab.from} <span className="font-black text-white">{source.from}</span>
            </p>
            {source.subject && (
              <p className="text-xs font-semibold text-white/85">
                {t.lab.subject} <span className="font-black text-white">{source.subject}</span>
              </p>
            )}
          </div>
          <div className="p-3.5">{body}</div>
        </div>
      )}
    </div>
  );
}
