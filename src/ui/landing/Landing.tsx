// The front page, all dark: what Pipodojo is, for whom, and a big "Go to playground" in the middle.
// Behind the whole page, one field of ASCII letters in Pipodojo's purples (React Bits
// GradientASCII): its glowing band lights the hero and dims as you scroll on, leaving faint
// drifting letters behind the sections, and a soft light follows the cursor everywhere. Below the
// hero: about, for teachers and parents (with the accounts waitlist), for researchers, and contact.
// The header links scroll to those sections (no address change, so the playground's screens are
// untouched).
import { Check, Copy, ExternalLink, Mail, Menu, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLang } from "../../i18n/index.tsx";
import { Button } from "../Button.tsx";
import { LangSwitch } from "../LangSwitch.tsx";
import { Pipo } from "../Pipo.tsx";
import { TOUCH } from "../device.ts";
import { play } from "../../app/sound.ts";
import { Footer } from "./Footer.tsx";
import { CONTACT_EMAIL, NIGHT, REPO_URL, scrollToSection, type SectionId } from "./shared.ts";
import { Waitlist } from "./Waitlist.tsx";

// The letter field is a WebGL canvas, loaded on its own so the page's words show first.
const GradientASCII = lazy(() => import("@/components/GradientASCII"));


/**
 * The component's own look (a glowing band of letters), in Pipodojo's colors: from the band's edge
 * to its brightest middle, violet, lilac white, soft lilac, lavender.
 */
const FIELD_COLORS = ["#5a46e0", "#f3f2ff", "#d3cfff", "#8c7dfb"];
/** Its letters, drawn in Nunito (the site's rounded font). */
const FIELD_FONT = '"Nunito Variable", ui-rounded, "Hiragino Maru Gothic ProN", system-ui, sans-serif';
/** How bright the band stays once you've scrolled past the hero (1 is full). */
const DIMMED = 0.35;

/** Cards and panels on the dark page: a solid dark fill (no blur, which would redraw with the field). */
const PANEL = "rounded-3xl bg-[#231c52]/80 ring-1 ring-white/10 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)]";


export function Landing({ onPlay }: { onPlay: () => void }) {
  const { t } = useLang();
  const l = t.landing;
  return (
    <div className="relative isolate min-h-dvh text-white" style={{ backgroundColor: NIGHT }}>
      <Field />
      <Header />
      <main>
        <Hero onPlay={onPlay} />
        <div className="mx-auto max-w-5xl px-4 pt-8 pb-16 md:px-6 md:pt-12 md:pb-20">
          <Section id="about" title={l.about.title} lead={l.about.lead}>
            <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
              {l.about.steps.map((step, i) => (
                <li key={step.title} className={`${PANEL} p-5`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm font-black text-white">{i + 1}</span>
                    <span className="text-2xl" aria-hidden="true">
                      {step.emoji}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{step.title}</h3>
                  <p className="mt-1 font-semibold text-brand-100/80">{step.text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-center text-sm font-bold text-brand-200">⚡ {l.about.powered}</p>
          </Section>

          <Divider />

          <Section id="teachers" title={l.teachers.title} lead={l.teachers.lead}>
            <Cards items={l.teachers.points} columns="md:grid-cols-2" />
            <p className="mt-4 rounded-3xl bg-amber-300/10 px-5 py-4 text-center font-bold text-amber-100 ring-1 ring-amber-200/30">💡 {l.teachers.idea}</p>
            <div className={`${PANEL} mt-4 px-5 py-8 text-center md:px-10 md:py-10`}>
              <h3 className="text-2xl font-black text-white">👪 {l.accounts.title}</h3>
              <p className="mx-auto mt-2 mb-6 max-w-xl font-semibold text-brand-100/85">{l.accounts.text}</p>
              <Waitlist roles={["parent", "teacher"]} />
            </div>
          </Section>

          <Divider />

          <Section id="researchers" title={l.researchers.title} lead={l.researchers.lead}>
            <Cards
              items={l.researchers.points}
              columns="md:grid-cols-3"
              // "See the code on GitHub" sits inside the card about auditing the code.
              extras={[
                <a
                  key="code"
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-extrabold text-white ring-1 ring-white/20 transition hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
                >
                  {l.researchers.code}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>,
              ]}
            />
            <div className={`${PANEL} mt-4 px-5 py-8 text-center md:px-10 md:py-10`}>
              <h3 className="mx-auto mb-6 max-w-xl text-xl font-black text-white">🔬 {l.researchers.invite}</h3>
              <Waitlist roles={["researcher"]} />
            </div>
          </Section>

          <Divider />

          <Contact />
        </div>
      </main>
      <Footer onPlay={onPlay} onSection={scrollToSection} />
    </div>
  );
}

/**
 * The letter field behind the whole page: one canvas fixed to the screen, so it costs the same
 * however long the page is. At the top it's the hero's glowing band; scrolling on dims the band to
 * faint drifting letters, while the cursor's light stays as bright everywhere.
 */
function Field() {
  const [height, setHeight] = useState(() => window.innerHeight);
  const [strength, setStrength] = useState(1);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const k = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.85)));
      // Rounded, so scrolling only re-renders when the brightness really changes.
      setStrength(Math.round((1 - (1 - DIMMED) * k) * 50) / 50);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      setHeight(window.innerHeight);
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <Suspense fallback={null}>
        <GradientASCII
          colors={FIELD_COLORS}
          fontFamily={FIELD_FONT}
          fontWeight={700}
          cellSize={TOUCH ? 14 : 18}
          // Phones draw the field at screen resolution, not retina, so scrolling stays smooth.
          dpr={TOUCH ? 1 : 1.5}
          shape="horizon"
          fieldStrength={strength}
          // The cursor scrambles a patch about 46px across, like the React Bits demo (the prop is a
          // share of the screen's height).
          scrambleRadius={Math.min(0.1, 46 / Math.max(1, height))}
          // A soft light around the cursor, about 150px across, that lights up the letters under it.
          pointerGlow={0.65}
          pointerGlowRadius={Math.min(0.3, 150 / Math.max(1, height))}
        />
      </Suspense>
    </div>
  );
}

/** The site header: Pipodojo, the section links and the language menu. Collapses to a menu on phones. */
function Header() {
  const { t } = useLang();
  const nav = t.landing.nav;
  const [open, setOpen] = useState(false);
  const links: { id: SectionId; label: string }[] = [
    { id: "about", label: nav.about },
    { id: "teachers", label: nav.teachers },
    { id: "researchers", label: nav.researchers },
    { id: "contact", label: nav.contact },
  ];
  const go = (id: SectionId) => {
    setOpen(false);
    play("tap");
    scrollToSection(id);
  };
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl bg-[#1b1640]/75 px-3 py-2 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.7)] ring-1 ring-white/10 backdrop-blur-xl md:px-4">
        <a
          href="/"
          className="flex items-center gap-2 rounded-xl text-lg font-black text-white focus-visible:outline-3 focus-visible:outline-brand-300"
        >
          <Pipo mood="happy" className="h-8 w-8" />
          Pipodojo
        </a>
        <nav aria-label={nav.label} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(link.id);
                  }}
                  className="rounded-full px-3 py-2 text-sm font-extrabold text-brand-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-brand-300"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-1">
          <LangSwitch />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 lg:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? nav.close : nav.menu}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="landing-menu"
          aria-label={nav.label}
          className="pop-in mx-auto mt-2 max-w-6xl rounded-2xl bg-[#231c52] p-2 shadow-xl ring-1 ring-white/10 lg:hidden"
        >
          <ul>
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(link.id);
                  }}
                  className="block rounded-xl px-3 py-3 font-extrabold text-white hover:bg-white/10"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

/** Pipo, the promise and the button to the playground, over the brightest part of the field. */
function Hero({ onPlay }: { onPlay: () => void }) {
  const { t } = useLang();
  const hero = t.landing.hero;
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center px-4 pt-24 pb-24">
      {/* A soft shadow under the words keeps them readable where the band glows brightest. */}
      <div className="flex max-w-2xl flex-col items-center text-center [text-shadow:0_2px_18px_rgb(27_22_64/0.85)]">
        <Pipo mood="happy" className="pipo-float h-24 w-24 md:h-28 md:w-28" />
        <p className="mt-4 rounded-full bg-brand-600/55 px-3 py-1 text-sm font-extrabold text-white ring-1 ring-white/40 backdrop-blur-md">{hero.tag}</p>
        <h1 className="mt-4 text-4xl leading-tight font-black text-balance text-white md:text-6xl">{hero.title}</h1>
        <p className="mt-4 max-w-xl text-lg font-semibold text-brand-100 md:text-xl">{hero.lead}</p>
        <Button className="mt-8 text-lg! md:min-h-14 md:px-8!" onClick={onPlay}>
          {hero.cta} →
        </Button>
        <p className="mt-4 rounded-full bg-[#1b1640]/70 px-3 py-1 text-sm font-bold text-brand-100">{hero.note}</p>
      </div>
    </section>
  );
}

function Section({ id, title, lead, children }: { id: SectionId; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="text-3xl font-black text-white md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 mb-6 max-w-3xl text-lg font-semibold text-brand-100/90">{lead}</p>
      {children}
    </section>
  );
}

/** `extras[i]` goes at the bottom of card i (e.g. a link that belongs with it). */
function Cards({
  items,
  columns,
  extras = [],
}: {
  items: readonly { emoji: string; title: string; text: string }[];
  columns: string;
  extras?: readonly ReactNode[];
}) {
  return (
    <ul className={`grid gap-3 md:gap-4 ${columns}`}>
      {items.map((item, i) => (
        <li key={item.title} className={`${PANEL} flex gap-3 p-5`}>
          <span className="text-2xl" aria-hidden="true">
            {item.emoji}
          </span>
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-white">{item.title}</h3>
            <p className="mt-1 font-semibold text-brand-100/80">{item.text}</p>
            {extras[i] && <div className="mt-auto pt-4">{extras[i]}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Between sections: a thin line that fades out at both ends, with a small glowing violet diamond in
 * the middle (it echoes the light that follows the cursor).
 */
function Divider() {
  return (
    <div className="flex items-center gap-4 py-8 md:py-10" aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
      <span className="h-2 w-2 rotate-45 rounded-[2px] bg-brand-300 shadow-[0_0_12px_3px_rgb(140_125_251/0.7)]" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
    </div>
  );
}

/** hello@pipodojo.com, as a link that opens the mail app and a button that copies the address. */
function Contact() {
  const { t } = useLang();
  const contact = t.landing.contact;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      play("tap");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard here; the address is on screen to copy by hand.
    }
  };
  return (
    <section id="contact" aria-labelledby="contact-title" className={`${PANEL} scroll-mt-24 p-6 text-center md:p-10`}>
      <span className="text-4xl" aria-hidden="true">
        💌
      </span>
      <h2 id="contact-title" className="mt-2 text-3xl font-black text-white md:text-4xl">
        {contact.title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-lg font-semibold text-brand-100/90">{contact.lead}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-lg font-black text-white shadow-[0_10px_24px_-10px_rgb(110_92_242/0.8)] transition hover:bg-brand-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
        >
          <Mail className="h-5 w-5" aria-hidden="true" />
          {CONTACT_EMAIL}
        </a>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-extrabold text-white ring-1 ring-white/20 transition hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
        >
          {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
          <span aria-live="polite">{copied ? contact.copied : contact.copy}</span>
        </button>
      </div>
    </section>
  );
}
