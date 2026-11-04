// A waitlist form on the front page, laid out like a classic signup strip: (optionally) who you are
// as a small segmented switch, then one row with the email, the year you were born and "Notify me",
// stacking on phones; errors and the privacy note sit centered underneath. Labels are kept for screen
// readers; on screen the placeholders say what goes where, so the row lines up.
//
// Adults only (COPPA): the birth year question gives no hint of the cutoff, anyone who might be
// under 18 gets a kind "ask a grown-up" message, nothing is sent, and the forms stay closed for the
// rest of the visit so a child can't simply try another year.
import { useId, useState, type FormEvent } from "react";
import { closeWaitlist, isSurelyAdult, joinWaitlist, waitlistClosed, type WaitlistResult, type WaitlistRole } from "../../app/waitlist.ts";
import { play } from "../../app/sound.ts";
import { useLang } from "../../i18n/index.tsx";

/** Every year from this one back 100 years: recent years too, so the list doesn't hint at an age. */
const YEARS = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i);

type Status = "idle" | "sending" | WaitlistResult;

const FIELD =
  "h-12 w-full rounded-2xl bg-white/10 px-4 font-bold text-white ring-1 ring-white/20 placeholder:text-brand-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300";

/** `roles`: the choices this form offers (the first is picked to start); one role shows no switch. */
export function Waitlist({ roles }: { roles: readonly WaitlistRole[] }) {
  const { lang, t } = useLang();
  const w = t.landing.waitlist;
  const id = useId();
  const [role, setRole] = useState<WaitlistRole>(roles[0] ?? "parent");
  const [email, setEmail] = useState("");
  const [year, setYear] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>(() => (waitlistClosed() ? "too_young" : "idle"));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    play("tap");
    const birthYear = Number(year);
    if (!isSurelyAdult(birthYear)) {
      closeWaitlist();
      setStatus("too_young");
      return;
    }
    setStatus("sending");
    const result = await joinWaitlist({ email, role, birthYear, lang, website });
    if (result === "too_young") closeWaitlist();
    setStatus(result);
  };

  if (status === "too_young" || status === "ok") {
    return (
      <p role="status" className="mx-auto max-w-xl rounded-2xl bg-white/10 px-5 py-4 text-center font-bold text-white ring-1 ring-white/15">
        {status === "ok" ? `🎉 ${w.done}` : `💜 ${w.tooYoung}`}
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} aria-label={w.label} className="mx-auto w-full max-w-2xl">
      {roles.length > 1 && (
        <fieldset className="mb-4 flex justify-center">
          <legend className="sr-only">{w.role}</legend>
          <div className="inline-flex rounded-full bg-white/10 p-1 ring-1 ring-white/15">
            {roles.map((r) => (
              <label
                key={r}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-extrabold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-300 ${
                  role === r ? "bg-brand-500 text-white shadow-sm" : "text-brand-100 hover:text-white"
                }`}
              >
                <input type="radio" name={`${id}-role`} value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                {w.roles[r]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sm:flex-1">
          <span className="sr-only">{w.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "invalid") setStatus("idle");
            }}
            placeholder={w.emailPlaceholder}
            aria-invalid={status === "invalid"}
            className={FIELD}
          />
        </label>
        <label className="sm:w-52">
          <span className="sr-only">{w.birthYear}</span>
          <select
            required
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={`${FIELD} ${year ? "" : "text-brand-200/70"} [&>option]:bg-[#231c52] [&>option]:text-white`}
          >
            <option value="" disabled>
              {w.birthYear}
            </option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {/* Hidden from people (and from screen readers and the keyboard); simple bots fill it in. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] h-px w-px opacity-0"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="h-12 shrink-0 rounded-2xl bg-brand-600 px-6 font-black whitespace-nowrap text-white shadow-[0_10px_24px_-10px_rgb(110_92_242/0.8)] transition hover:bg-brand-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:opacity-60"
        >
          {status === "sending" ? w.sending : w.submit}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 text-center text-sm font-bold text-amber-200 empty:hidden">
        {status === "invalid" ? w.invalid : status === "failed" ? w.failed : ""}
      </p>
      <p className="mx-auto mt-3 max-w-lg text-center text-xs leading-relaxed font-semibold text-brand-200/80">🔒 {w.privacy}</p>
    </form>
  );
}
