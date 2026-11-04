# CLAUDE.md

Project: Pipodojo (the mascot, and the player's agent, is a little robot called Pipo), a free AI playground that teaches very normal, non-technical people to instruct personal AI agents: build an instruction by tapping preset pieces (never typing), press Check, and see what Pipo (Muse Spark) does with it. Call it an AI playground, never "a game" or "Duolingo-style", in copy, the README and submissions. No tools or business rules for the player to think about; keep it simple and playful. It is not about training AI models; never use "train" in player-facing copy. Built solo for the Meta Global AI Developer Hackathon (Indie track). Submissions are due Nov 4, 2026 at 9 pm ET; judging runs Nov 4 to 8. Live at https://pipodojo.com.

## Read first
- Read `SPEC.md` completely at the start of every session. It is the source of truth.
- If something is unclear or missing, propose an answer and ask before building on it.

## Stack (approved)
TypeScript (strict), React 18, Vite, Tailwind CSS v4, Motion, Zod, Vitest, canvas-confetti, three.js with React Three Fiber and drei (the 3D town), Paper Shaders, swup, egjs Flicking, Hugeicons and lucide icons, Nunito and M PLUS Rounded 1c (Japanese, loaded only in Japanese) via Fontsource, country-flag-emoji-polyfill. Components from smoothui and React Bits live in `src/components`. Models: `muse-spark-1.2-contributor` (Pipo, with tool calling) and `muse-image-1.0` (postcards), both fixed server-side. Backend is the API code in `functions/api` (chat, image, and a guard middleware), run by the Cloudflare Worker in `worker/index.js`. Hosting is a Cloudflare Worker with static assets (`wrangler.jsonc`), deployed by Workers Builds from the public GitHub repo.
- Ask before adding any other dependency.
- No auth, no cookies, nothing that tracks or identifies a person. Only two things are counted, both by country and cookie-free: Cloudflare Web Analytics on the live site (`src/app/analytics.ts`: visits, pages, countries, devices), and today's leaderboard (`functions/api/leaderboard.js`, Cloudflare D1: daily star totals per country, plus one-time receipts that last at most 30 minutes). Never store names, IP addresses or anything else about a person, with one exception: the accounts waitlist (`functions/api/waitlist.js`, same D1 database) keeps an email, the role picked (parent, teacher or researcher), the language and the signup day, from adults only. It asks for a birth year in a neutral way and turns away anyone who might be under 18 (COPPA); the birth year is never stored. Emails are removed on request at hello@pipodojo.com and used only to announce accounts and the research data. Donations go through Ko-fi (`src/ui/Support.tsx`): its panel loads only when a player opens the Support window, never on page load.

## Hard rules
- Never commit secrets. `MODEL_API_KEY` lives in `.dev.vars` (gitignored) locally and in a Cloudflare secret in production. Never put it in client code, build output, or logs.
- The repo is public. Everything must be original work built during the hackathon (Oct 27 to Nov 4, 2026).
- No chat UI. The player never types a prompt.
- Scoring is rule-based in code. Never ask a model to score or judge the player.
- A judge must never see a raw error. Every failure path falls back to a replay.
- `src/engine` is pure TypeScript with no React imports. Model client, clock, and storage are injected.

## How to work
- Work in vertical slices. Each slice ends in something runnable. Commit after each working slice with a clear message.
- For anything bigger than a small change, propose a short plan first and wait for approval.
- Write Vitest tests for the evaluator, flaw activation, replay selection, and the runner (with a fake model client) as you build them.
- Validate all files in `/missions` with Zod in a test.
- After each slice, tell me exactly how to run it and what to try, including a failing setup.
- Branches: work on `staging` (pushing it builds https://staging-pipodojo.nerdypunk.workers.dev). `main` is the live site; ship only when I say so, with a fast-forward merge of `staging` into `main`, then push.
- Cloudflare from the terminal: use the `cf` CLI (Wrangler has no API token in this environment). The live leaderboard is the D1 database `pipodojo-leaderboard`, shared by staging and live.

## Commands (keep these working)
- `npm run dev`: starts Vite and the Worker together for local development.
- `npm run build`: production build to `dist`.
- `npm test`: runs Vitest.
- `npm run check:mission -- <lesson-id> --runs 5`: plays a lesson against the live API and reports how often each gap shows up (`--lang es` for Spanish, `--lang ja` for Japanese).

## Style
- Friendly, plain-language UI copy in sentence case. Never blame the player.
- Mobile-first, accessible, respects reduced motion.
- Keep components small and typed. Prefer clarity over cleverness.
