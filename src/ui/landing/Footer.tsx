// The front page's footer. Pipo, the tagline and the links on the page's own dark, then a scene
// drawn in code (SVG): Pipodojo Town at night, floating on its island like in the playground: the
// office tower, the college, the café, the house and the treehouse with their windows lit, the
// sakura shrine glowing in the middle, little islands still under construction, a moon and
// twinkling stars, and Pipo flying across the sky. The credits sit below it, on the dark.
// All static shapes plus a few CSS animations, so it costs next to nothing to draw.
import { ExternalLink } from "lucide-react";
import { useLang } from "../../i18n/index.tsx";
import { Pipo } from "../Pipo.tsx";
import { SupportButton } from "../Support.tsx";
import { CONTACT_EMAIL, NIGHT, REPO_URL, type SectionId } from "./shared.ts";

const SITE_URL = "https://nerdypunk.dev";
const PRIVACY_URL = `${REPO_URL}#privacy`;

const LINK = "rounded-md font-semibold text-brand-100/85 transition hover:text-white focus-visible:outline-2 focus-visible:outline-brand-300";
const CREDIT = "underline decoration-white/30 underline-offset-2 hover:text-white";

interface Props {
  onPlay: () => void;
  onSection: (id: SectionId) => void;
}

export function Footer({ onPlay, onSection }: Props) {
  const { t } = useLang();
  const f = t.landing.foot;
  const nav = t.landing.nav;
  const section = (id: SectionId, label: string) => (
    <a
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault();
        onSection(id);
      }}
      className={LINK}
    >
      {label}
    </a>
  );
  const external = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center gap-1.5`}>
      {label}
      <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
    </a>
  );

  return (
    <footer className="relative text-white">
      {/* A soft fade from the page's letter field into the footer's solid dark */}
      <div className="h-24" style={{ background: `linear-gradient(to bottom, transparent, ${NIGHT})` }} aria-hidden="true" />

      <div style={{ backgroundColor: NIGHT }}>
        {/* Name, tagline and links */}
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pt-6 pb-4 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <p className="flex items-center gap-2.5 text-2xl font-black">
              <Pipo mood="happy" className="h-10 w-10" />
              Pipodojo
            </p>
            <p className="mt-4 max-w-sm text-lg leading-snug font-semibold text-brand-100">{f.tagline}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={`${LINK} mt-5 inline-block text-white underline decoration-white/30 underline-offset-4`}>
              {CONTACT_EMAIL}
            </a>
          </div>
          <nav aria-label={f.pipodojo}>
            <h2 className="mb-4 font-black">{f.pipodojo}</h2>
            <ul className="space-y-3">
              <li>
                <button type="button" onClick={onPlay} className={LINK}>
                  {f.playground}
                </button>
              </li>
              <li>{section("about", nav.about)}</li>
              <li>{section("teachers", nav.teachers)}</li>
              <li>{section("researchers", nav.researchers)}</li>
            </ul>
          </nav>
          <nav aria-label={f.project}>
            <h2 className="mb-4 font-black">{f.project}</h2>
            <ul className="space-y-3">
              <li>{external(REPO_URL, f.code)}</li>
              <li>{external(PRIVACY_URL, f.privacy)}</li>
            </ul>
          </nav>
          <nav aria-label={f.involved}>
            <h2 className="mb-4 font-black">{f.involved}</h2>
            <ul className="space-y-3">
              <li>{section("teachers", f.waitlist)}</li>
              <li>
                <SupportButton className={LINK}>{f.support}</SupportButton>
              </li>
              <li>{section("contact", nav.contact)}</li>
            </ul>
          </nav>
        </div>

        {/* Pipodojo Town at night, with Pipo flying over it */}
        <div className="relative mx-auto max-w-6xl" aria-hidden="true">
          <TownAtNight />
          <div className="absolute top-[9%] left-[74%] w-[7%] min-w-9">
            <div className="pipo-float">
              <Pipo mood="happy" className="h-auto w-full drop-shadow-[0_0_20px_rgb(255_150_90/0.6)]" />
            </div>
          </div>
        </div>

        {/* Credits, on the dark below the scene */}
        <div className="px-6 pt-2 pb-8 text-center text-sm font-semibold text-brand-200">
          <p>
            © {new Date().getFullYear()} Pipodojo ·{" "}
            {t.common.openSourceAuthorFirst ? (
              <>
                <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={CREDIT}>
                  nerdypunk.dev
                </a>
                {t.common.openSourceBy}
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={CREDIT}>
                  {t.common.openSourceLink}
                </a>
              </>
            ) : (
              <>
                {t.common.openSourceA}{" "}
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={CREDIT}>
                  {t.common.openSourceLink}
                </a>{" "}
                {t.common.openSourceBy}{" "}
                <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={CREDIT}>
                  nerdypunk.dev
                </a>
              </>
            )}{" "}
            · {f.powered}
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Stars across the sky: fixed spots (x, y, radius, twinkle delay), the same every visit, clear of the island. */
const STARS: [number, number, number, number][] = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return [r(1) * 1200, 14 + r(2) * 170, 0.8 + r(3) * 1.4, r(4) * 4];
});

/** Window lights: amber when someone's home, dim when not. */
const LIT = "#ffd27a";
const DARK_WINDOW = "#2b2560";

/**
 * Pipodojo Town at night: the floating island and its places, back to front. Drawn in a 1200 x 470
 * box that scales with the footer.
 */
function TownAtNight() {
  return (
    <svg viewBox="0 0 1200 470" className="block h-auto w-full">
      <defs>
        <radialGradient id="town-halo" cx="0.5" cy="0.62" r="0.5">
          <stop offset="0" stopColor="#6e5cf2" stopOpacity="0.38" />
          <stop offset="1" stopColor="#6e5cf2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="town-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3277" />
          <stop offset="1" stopColor="#1f1a4c" />
        </linearGradient>
        <linearGradient id="town-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f5a9a" />
          <stop offset="1" stopColor="#2c3a78" />
        </linearGradient>
        <radialGradient id="town-sakura-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff9ec7" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ff9ec7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="town-warm-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The night sky's glow around the island, the stars and the moon */}
      <ellipse cx="600" cy="300" rx="560" ry="210" fill="url(#town-halo)" />
      {STARS.map(([x, y, r, delay], i) => (
        <circle key={i} className="twinkle" cx={x} cy={y} r={r} fill="#f3f2ff" style={{ animationDelay: `${delay}s` }} />
      ))}
      <g transform="translate(150 70)">
        <circle r="26" fill="#f3f2ff" />
        <circle cx="11" cy="-7" r="23" fill={NIGHT} />
      </g>

      {/* Pipo's trail across the sky, from the left to where Pipo is flying */}
      <path d="M560 150 C660 92 760 70 870 74" stroke="#ffb27a" strokeWidth="2.5" strokeDasharray="2 11" strokeLinecap="round" fill="none" opacity="0.55" />

      {/* The little islands still under construction */}
      <g transform="translate(110 215)">
        <path d="M-58 0 C-40 -10 40 -10 58 0 L30 24 L0 40 L-28 22 Z" fill="url(#town-rock)" />
        <path d="M-58 0 C-40 -10 40 -10 58 0 C30 6 -30 6 -58 0 Z" fill="url(#town-grass)" />
        {/* a tiny crane */}
        <path d="M-14 -4 V-58 M-14 -58 H32 M-14 -50 L4 -58 M28 -58 V-36" stroke="#ffb27a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="20" y="-36" width="16" height="10" rx="2" fill="#ffd27a" />
      </g>
      <g transform="translate(1095 190)">
        <path d="M-48 0 C-32 -9 32 -9 48 0 L24 20 L0 34 L-22 18 Z" fill="url(#town-rock)" />
        <path d="M-48 0 C-32 -9 32 -9 48 0 C24 5 -24 5 -48 0 Z" fill="url(#town-grass)" />
        <rect x="-18" y="-22" width="22" height="18" rx="3" fill="#ffb27a" opacity="0.85" />
        <rect x="8" y="-14" width="14" height="10" rx="2" fill="#d3cfff" opacity="0.8" />
      </g>

      {/* The island: rocky underside, then the grass on top */}
      <path
        d="M215 330 C250 296 950 296 985 330 C1000 346 965 360 935 372 L870 400 L810 428 L735 455 L660 470 L600 476 L540 466 L465 448 L395 424 L330 398 L268 372 C238 360 200 346 215 330 Z"
        fill="url(#town-rock)"
      />
      {/* Light strata in the rock */}
      <path d="M300 372 C420 392 520 398 600 398 C700 398 800 388 900 370 M380 420 C470 436 540 440 600 440 C680 440 740 430 820 412" stroke="#4a3f92" strokeWidth="3" fill="none" opacity="0.6" />
      <path d="M215 330 C250 296 950 296 985 330 C955 350 245 350 215 330 Z" fill="url(#town-grass)" />

      {/* Office tower */}
      <g transform="translate(270 0)">
        <rect x="0" y="168" width="58" height="160" rx="4" fill="#3b3486" />
        <rect x="24" y="148" width="4" height="22" fill="#8c7dfb" />
        <circle className="twinkle" cx="26" cy="146" r="4" fill="#ff6b7d" />
        {Array.from({ length: 6 }, (_, row) =>
          Array.from({ length: 3 }, (_, col) => (
            <rect
              key={`${row}-${col}`}
              x={8 + col * 16}
              y={180 + row * 22}
              width="10"
              height="12"
              rx="2"
              fill={(row * 3 + col) % 4 === 1 ? DARK_WINDOW : LIT}
            />
          )),
        )}
      </g>

      {/* College: columns, a pediment and a clock */}
      <g transform="translate(360 0)">
        <rect x="0" y="262" width="118" height="66" rx="3" fill="#4a3f8f" />
        <path d="M-8 264 L59 228 L126 264 Z" fill="#6e5cf2" />
        <circle cx="59" cy="250" r="8" fill="#f3f2ff" />
        <path d="M59 245 V250 L63 252" stroke="#3b2d96" strokeWidth="2" fill="none" strokeLinecap="round" />
        {[14, 38, 74, 98].map((x) => (
          <rect key={x} x={x} y="270" width="7" height="50" rx="2" fill="#b2a9ff" opacity="0.7" />
        ))}
        <rect x="49" y="292" width="20" height="36" rx="10" fill={LIT} />
      </g>

      {/* The sakura shrine on its mound, in the middle */}
      <circle cx="600" cy="230" r="110" fill="url(#town-sakura-glow)" />
      <path d="M520 320 C550 290 650 290 680 320 Z" fill="#33437f" />
      <path d="M598 300 C596 272 600 256 592 240 M598 276 C610 266 622 260 632 256 M596 266 C584 258 572 256 562 258" stroke="#3a2848" strokeWidth="7" fill="none" strokeLinecap="round" />
      {(
        [
          [600, 226, 30, "#ff9ec7"],
          [570, 240, 24, "#f7b8dc"],
          [632, 238, 26, "#f7b8dc"],
          [584, 206, 22, "#ffc2e0"],
          [618, 208, 22, "#ff9ec7"],
          [550, 256, 16, "#ff9ec7"],
          [650, 256, 17, "#ffc2e0"],
          [602, 250, 20, "#e88bbf"],
        ] as [number, number, number, string][]
      ).map(([x, y, r, c], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={c} />
      ))}
      <g transform="translate(600 290)" fill="#e0475b">
        <rect x="-30" y="-6" width="60" height="6" rx="3" />
        <rect x="-24" y="4" width="48" height="4" rx="2" />
        <rect x="-19" y="-4" width="5" height="30" rx="2" />
        <rect x="14" y="-4" width="5" height="30" rx="2" />
        <rect x="-33" y="-10" width="66" height="5" rx="2.5" fill="#9c2f40" />
      </g>

      {/* Café: a striped awning and a warm window */}
      <g transform="translate(700 0)">
        <circle cx="45" cy="300" r="60" fill="url(#town-warm-glow)" />
        <rect x="0" y="270" width="92" height="58" rx="4" fill="#5a3f86" />
        <path d="M-6 268 H98 L92 284 H0 Z" fill="#ff9ec7" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${4 + i * 20} 268 H${14 + i * 20} L${12 + i * 20} 284 H${2 + i * 20} Z`} fill="#fff1f7" />
        ))}
        <rect x="10" y="292" width="44" height="26" rx="4" fill={LIT} />
        <rect x="62" y="292" width="20" height="36" rx="3" fill="#ffb27a" />
        <circle cx="30" cy="262" r="5" fill="#ffd27a" />
      </g>

      {/* House: a pitched roof, a chimney and a lit window */}
      <g transform="translate(815 0)">
        <rect x="0" y="276" width="72" height="52" rx="3" fill="#47407f" />
        <path d="M-8 280 L36 244 L80 280 Z" fill="#8c7dfb" />
        <rect x="52" y="250" width="10" height="18" fill="#3b3486" />
        <rect x="12" y="290" width="20" height="18" rx="3" fill={LIT} />
        <rect x="44" y="296" width="16" height="32" rx="3" fill="#2b2560" />
      </g>

      {/* Treehouse: a tree with a little lit house in its branches */}
      <g transform="translate(905 0)">
        <rect x="26" y="236" width="12" height="92" rx="4" fill="#3a2848" />
        <circle cx="32" cy="216" r="40" fill="#2f4f86" />
        <circle cx="8" cy="230" r="22" fill="#2a4478" />
        <circle cx="58" cy="226" r="24" fill="#2a4478" />
        <rect x="12" y="246" width="40" height="28" rx="3" fill="#7a5ab0" />
        <path d="M8 248 L32 230 L56 248 Z" fill="#b2a9ff" />
        <rect x="22" y="254" width="12" height="10" rx="2" fill={LIT} />
        <path d="M46 276 V322 M54 276 V322 M46 286 H54 M46 298 H54 M46 310 H54" stroke="#ffb27a" strokeWidth="2" opacity="0.8" />
      </g>

      {/* Little trees and lamps along the edges */}
      {(
        [
          [236, 324, 12],
          [254, 320, 9],
          [490, 318, 10],
          [690, 318, 9],
          [968, 326, 11],
        ] as [number, number, number][]
      ).map(([x, y, r], i) => (
        <g key={i} fill="#2f4f86">
          <circle cx={x} cy={y - r} r={r} />
          <circle cx={x + r * 0.7} cy={y - r * 0.5} r={r * 0.7} />
        </g>
      ))}
      {[345, 505, 680, 800].map((x) => (
        <g key={x}>
          <circle cx={x} cy="304" r="9" fill="url(#town-warm-glow)" />
          <rect x={x - 1} y="306" width="2" height="18" fill="#8c7dfb" />
          <circle cx={x} cy="304" r="3" fill={LIT} />
        </g>
      ))}
    </svg>
  );
}
