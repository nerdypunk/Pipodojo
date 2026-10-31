# Pipodojo

**Learn to use AI agents, one tap at a time.** Pipodojo is a Duolingo-style game where people with no technical background learn to prompt a personal AI agent. Pipo, a little robot assistant powered by Meta's Muse Spark, gets a real-life request. You build the prompt by tapping ready-made pieces (no typing), then see what Pipo does with it. Leave out something that matters and you'll see it in Pipo's answer.

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
- `npm run check:mission -- parent-01-dinner --runs 5` plays a lesson's key prompts against the live API and reports how often each gap shows up in Pipo's answer.

## How it works

- `missions/*.json`: one file per lesson (the situation, the prompt pieces, and what goes wrong when a piece is missing), validated with Zod. Adding a lesson needs no code changes.
- `src/engine`: pure TypeScript game engine (prompt building, asking Pipo, rule-based stars). No React. A model never scores the player.
- `src/ui`: the screens.
- `functions/api/chat.js`: the only server code. It holds the API key, picks the model, and caps cost.

## Powered by Muse Spark

Pipo's answers come live from Meta's **Muse Spark** model through the Meta Model API. Pipodojo uses the `muse-spark-1.2-contributor` tier everywhere, locally and deployed: it costs less, and in return Meta may use the prompts to improve its models. Players never type, so every prompt is built from the game's own preset pieces and nothing personal is sent. Pipo's role and answer format come from each lesson file; the stars are worked out by the game's own rules, never by a model.

In later lessons Pipo **acts**, using Muse Spark tool calling: each lesson offers pretend app actions (send or draft a WhatsApp message; pay and order, or show the cart first). Muse Spark picks one and fills in the details, and the game shows the result on a floating phone you can drag around. When Pipo is waiting for your OK, tap Send or Pay on that phone: Pipo is told to go ahead and finishes the job with a second tool call. Nothing real is ever sent or bought.

## Credits

Pipodojo's game, lessons and Pipo were built during the hackathon. It also uses these open-source projects:

- [peel.js](https://github.com/andrewplummer/peel-js) by Andrew Plummer (MIT), copied into `src/vendor/peel` for the path reward
- [smoothui](https://smoothui.dev) (Siri orb, dynamic island) and [React Bits](https://reactbits.dev) (StarBorder, PixelTransition and more), added with the shadcn CLI into `src/components`
- [Paper Shaders](https://github.com/paper-design/shaders) (mesh gradient background, card glow), [swup](https://swup.js.org) overlay and slide themes (page transitions), [egjs Flicking](https://naver.github.io/egjs-flicking/) (path carousel), [Motion](https://motion.dev), [canvas-confetti](https://github.com/catdad/canvas-confetti)
- [Nunito](https://fonts.google.com/specimen/Nunito) font via Fontsource
