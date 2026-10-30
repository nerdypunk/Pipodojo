# CLAUDE.md

Project: Pipodojo (the mascot, and the player's agent, is a little robot called Pipo), a Duolingo-style game that teaches non-technical people to set up and supervise AI agents. Built solo for the Meta Global AI Developer Hackathon.

## Read first
- Read `SPEC.md` completely at the start of every session. It is the source of truth.
- If something is unclear or missing, propose an answer and ask before building on it.

## Stack (approved)
TypeScript (strict), React 18, Vite, Tailwind CSS, Framer Motion, react-router (HashRouter), Zustand, Zod, Vitest, canvas-confetti. Backend is one Cloudflare Pages Function at `functions/api/chat.js`. Hosting is Cloudflare Pages deployed from the public GitHub repo.
- Ask before adding any other dependency.
- No database, no auth, no analytics or tracking.

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

## Commands (keep these working)
- `npm run dev`: starts Vite and the Pages Function together for local development.
- `npm run build`: production build to `dist`.
- `npm test`: runs Vitest.
- `npm run record`: records replays against the live API.

## Style
- Friendly, plain-language UI copy in sentence case. Never blame the player.
- Mobile-first, accessible, respects reduced motion.
- Keep components small and typed. Prefer clarity over cleverness.
