# Prod.io

A 2D top-down music-industry tycoon game. Start as a bedroom producer and build
an entertainment empire in a living city.

Status: **v1-beta.5**. Milestone 0 done; Milestone 1 in progress (character creation, phone and bank, needs/food/rent, beat maker, beat ratings and skills shipped). You can walk around your apartment,
run and pause the clock, and resume from the autosave.

Live build: https://prod-io-game.netlify.app (updated after every merge to `main`).

## Run it

```bash
npm install
npm run dev        # open the printed localhost URL
```

Controls: `WASD`/arrows walk · `E` interact · `Space` pause · `1` `2` `3` speed · `` ` `` debug panel.

Other scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Docs

- [Game design](docs/GAME_DESIGN.md): vision, systems, decisions
- [Architecture](docs/ARCHITECTURE.md): tech stack, code structure, UI design system
- [Roadmap](docs/ROADMAP.md): milestones, each ending in a playable build
- [Changelog](CHANGELOG.md): what changed in each release

## Branches and releases

Each update is built on a `feature/*` branch and merged into `main`. Releases are
tags on `main` (`v1-beta`, `v1-beta.2`, ...). See [CLAUDE.md](CLAUDE.md).
