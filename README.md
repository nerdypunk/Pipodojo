# Pipodojo

**Train your first AI agent.** Pipodojo is a Duolingo-style game where people with no technical background learn to set up and supervise an AI agent: Pipo, a little robot you equip, aim, and catch when it goes wrong.

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

Other commands:

- `npm test` runs the tests.
- `npm run build` builds the site into `dist`.
