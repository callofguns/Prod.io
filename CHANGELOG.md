# Changelog

Each release is a git tag on `main`. Versions follow `v<major>-beta.<n>` during
the beta, then semantic versioning (`v1.0.0`, `v1.1.0`, ...) from the first full release.

## Unreleased

- Hid the "Powered by Netlify" badge on the live site.

## v1-beta.2

Character creation (Milestone 1, update 1) and Netlify hosting.

- Hosted on Netlify; the live site updates after every merge to `main`.
- Character creation: name, producer alias, skin tone, hairstyle, hair colour, top and
  pants, with a turnable preview.
- Three starting backgrounds (Self-taught, Music school dropout, Club DJ) that set
  starting skills, cash and debt.
- Saves from v1-beta upgrade automatically (you become a Self-taught producer).

## v1-beta

First tagged build: the foundation (Milestone 0).

- Title screen with Continue / New game and a single autosave per playthrough.
- Walkable pixel-art apartment with collisions, interaction prompts and day/night lighting.
- In-game clock with pause and 1x / 2x / 4x speed, shown on a tape-transport HUD.
- Autosave every in-game day and when the tab closes.
- Debug panel (backtick key) for money, time skips and save management.
- Design docs: game design, architecture and roadmap.
