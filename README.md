# Pipodojo

**Learn to use AI agents, one tap at a time.** Pipodojo is a Duolingo-style game where people with no technical background learn to use an AI agent: give Pipo, a little robot agent, the right tools, build a clear prompt by tapping options (no typing), and catch it when it goes wrong.

Built solo for the Meta Global AI Developer Hackathon (Indie Developer track), Oct 27 to Nov 4, 2026.

> Work in progress. Live link, Meta tools used, and the full "built during the hackathon" story are coming.

## Run it locally

Requires Node 24 (see `.nvmrc`).

```bash
npm install
cp .dev.vars.example .dev.vars   # then paste your Meta Model API key
npm run dev                      # open http://localhost:5173
```

`npm run dev` starts Vite and the Cloudflare Pages Function (`functions/api/chat.js`) together. Vite forwards `/api/*` to the function, which holds the API key.

Add `?debug=1` to the URL (http://localhost:5173/?debug=1) to see the run log and score breakdown.

Other commands:

- `npm test` runs the tests.
- `npm run build` builds the site into `dist`.
- `npm run check:mission -- biz-01-refund --runs 5` plays a mission's key setups against the live API and reports how often each flaw shows up.

## How it works

- `missions/*.json`: one file per mission, validated with Zod. Adding a mission needs no code changes.
- `src/engine`: pure TypeScript game engine (agent loop, simulated tools, rule-based scoring). No React.
- `src/ui`: the screens.
- `functions/api/chat.js`: the only server code. It holds the API key, picks the model, and caps cost.
