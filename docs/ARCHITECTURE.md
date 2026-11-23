# Music Mogul — Technical Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Type safety across a large simulation |
| Build | Vite | Fast dev server and builds |
| World rendering | Phaser 3 | Mature 2D engine: tilemaps, sprites, cameras, input |
| UI (menus, phone, DAW, dashboards) | HTML/CSS overlay above the Phaser canvas (framework chosen with the UI design pass) | Rich, crisp, accessible UI is far easier in the DOM than in canvas |
| Audio | Web Audio API (possibly Tone.js) | Step sequencer playback with real samples |
| Tests | Vitest | Fast unit tests for simulation logic |
| Saves | IndexedDB (localStorage fallback) | Large save files, versioned |
| Desktop (later) | Tauri or Electron | Steam/desktop builds |

## Core principle: the simulation is separate from the view

```
┌───────────────────────────────────────────────┐
│  View layer                                   │
│  Phaser scenes (city, interiors)  +  UI overlay│
│  reads state, sends Commands                  │
└───────────────▲───────────────────┬───────────┘
                │ events / snapshots│ commands
┌───────────────┴───────────────────▼───────────┐
│  Simulation core (pure TypeScript, no Phaser) │
│  Clock → Systems → World state                │
│  deterministic, seeded RNG, fully testable    │
└───────────────────────────────────────────────┘
```

- The **simulation core** has no rendering code. It can run headless in tests, which
  lets us simulate years of the economy in seconds to balance it.
- The **view** never changes state directly. It issues **commands**
  (`ProduceBeat`, `ListBeat`, `PostToInstaSnap`, `SignContract`...) which systems validate and apply.
- Systems announce changes on a typed **event bus** (`BeatSold`, `DayStarted`,
  `RelationshipChanged`...) which drives the UI, notifications and other systems.

## Simulation core

- **Clock**: in-game minutes. Real-time with pause, 1x / 2x / 4x. Systems subscribe to
  minute, hour, day, week and month ticks.
- **World state**: one serializable object made of plain data (no class instances),
  stored in normalized tables by ID (`artists`, `beats`, `songs`, `companies`, `contracts`, ...).
- **Systems**: each owns one domain and runs on ticks.
  - `NeedsSystem`, `SkillSystem`, `ProductionSystem`
  - `MarketSystem` (BeatHub), `LoopMarketSystem` (LoopVault)
  - `PlatformSystem` (streams, views, followers, payouts)
  - `SocialSystem` (posts, reach, DMs), `RelationshipSystem`
  - `TrendSystem`, `NpcCareerSystem`, `ReleaseSystem`, `ChartSystem`
  - `EconomySystem` (ledger, rent, wages, taxes, loans), `ContractSystem`
  - `PropertySystem`, `EmployeeSystem`, `CompanySystem`
- **Two detail levels**: the player and nearby/owned entities update per minute;
  the wider industry updates once per in-game day.
- **Seeded RNG**: a seeded random generator in state, so saves and tests are reproducible.
- **Money**: stored as integer cents to avoid floating-point drift.

## Content is data

Genres, subgenres, gear, loops, buildings, furniture, NPC name pools, platform
names and payout rates live in typed data files under `src/content/`. Balancing
means editing data, not code. Parody brand names live in one file.

## Saves

- Versioned save format with migration functions (`v1 → v2 → ...`) so updates
  don't break old saves.
- Autosave each in-game day, plus manual slots.

## Proposed folder layout

```
src/
  sim/              # pure simulation, no Phaser imports
    core/           # clock, event bus, RNG, command dispatcher, state types
    systems/        # one file/folder per system
    models/         # data types: Beat, Artist, Contract, Company...
  content/          # data: genres, gear, loops, brands, city, balance constants
  game/             # Phaser: scenes, tilemaps, player controller, NPC sprites
  ui/               # overlay UI: HUD, phone apps, DAW, menus
  audio/            # sequencer playback, sample loading
  save/             # persistence + migrations
tests/              # Vitest, including long headless economy runs
docs/               # design + architecture + roadmap
```

## Quality rules
- `src/sim` must never import from `src/game` or `src/ui` (enforced by lint).
- Every system gets unit tests; the economy gets a headless "simulate 2 years" test with
  sanity bounds (no runaway inflation, no NaN money).
- A debug panel (toggle with backtick) to add money, skip time and inspect state.
