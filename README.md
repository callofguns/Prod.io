# Prod.io

A 2D top-down music-industry tycoon game. Start as a bedroom producer and build
an entertainment empire in a living city.

Status: **v1-beta.6**. Milestones 0 and 1 done: a bedroom producer who makes beats, sells them on
BeatHub, pays rent and levels up. Next: the city and social media (Milestone 2).

Live build: https://prod-io-game.netlify.app (updated after every merge to `main`).

## Run it

```bash
npm install
npm run dev        # open the printed localhost URL
```

Controls: `WASD`/arrows walk · `E` interact · `Space` pause · `1` `2` `3` speed · `` ` `` debug panel.
You can also click (or tap) the floor to walk, and click furniture to use it.

## Play on iPhone

Open the live build in Safari and turn the phone sideways (it plays in landscape).
To install it, tap **Share**, then **Add to Home Screen**: it opens full screen, works
offline, and keeps your save safer. Safari and the home-screen app keep separate saves;
use **Settings → Save data** to export from one and import into the other.

Other scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Docs

- [Game design](docs/GAME_DESIGN.md): vision, systems, decisions
- [Architecture](docs/ARCHITECTURE.md): tech stack, code structure, UI design system
- [Roadmap](docs/ROADMAP.md): milestones, each ending in a playable build
- [Changelog](CHANGELOG.md): what changed in each release

## Branches and releases

Each update is built on a `feature/*` branch and merged into `main`. Releases are
tags on `main` (`v1-beta`, `v1-beta.2`, ...). See [CLAUDE.md](CLAUDE.md).
