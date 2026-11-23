# Music Mogul — Roadmap

Built in small, playable increments. Each milestone ends with something you can
open in a browser and playtest. Visual and UI design work waits for the
`appledesign` skill to be installed; the simulation and engine work does not.

## Milestone 0 — Foundation (no gameplay yet)
- Vite + TypeScript + Phaser project, lint, Vitest.
- Simulation core: clock (pause / 1x / 2x / 4x), event bus, command dispatcher,
  seeded RNG, money-in-cents helpers, world state types.
- Save/load with versioning and autosave.
- A placeholder Phaser scene: a walkable top-down room with a character, plus a debug panel.
- **Playtest:** walk around a room, watch the clock run, save and reload.

## Milestone 1 — Bedroom Producer (first vertical slice)
- Player apartment interior: bed, computer, fridge, door.
- Needs: energy, hunger, happiness; rent due weekly.
- In-game DAW v1: step sequencer with real drum sounds and a few loops; genre/BPM/key.
- Beat quality scoring (pattern + skills + gear + needs).
- Skills with XP from producing.
- BeatHub v1: list beats with license tiers, NPC buyers purchase over time.
- Phone v1: Bank, BeatHub stats, Messages.
- **Playtest:** make beats, sell leases, pay rent, level up skills, go broke or not.

## Milestone 2 — The City and Social Media
- Bayport city map with 2–3 districts to start (Eastside, Midtown, Downtown).
- Enter buildings: gear store, grocery store, café.
- Transport: walk, bus, rideshare.
- Gear purchases that change production quality.
- LoopVault: subscription, credits, buying loops.
- InstaSnap + ViewTube type-beat channel: posting, followers, views driving BeatHub traffic.
- **Playtest:** a full early-game loop across the city.

## Milestone 3 — The Living Industry
- NPC artists/producers with career state machines and daily abstract simulation.
- Trend system with charts; Chirp news feed.
- Relationships and collabs: DMs, studio sessions, features, placements.
- Songs and releases: NPCs release songs using your beats; Streamly / Pear Music /
  CloudSound / ViewTube stats and delayed royalty payouts.
- Distribution via a third-party distributor (the player's own comes later).
- **Playtest:** an industry that moves without you; a lease that blows up.

## Milestone 4 — Studio Owner
- Real estate: rent or buy properties.
- Studio builder: place rooms, booths, gear, furniture.
- Studio bookings from NPC artists, hourly rates, engineer sessions.
- Hiring employees, wages, morale; first automation.
- Sample packs and drum kits as products.

## Milestone 5 — Record Label
- Register companies; company bank accounts and P&L.
- A&R scouting, signing artists, contract negotiation (advances, royalty rates, 360 deals).
- Release planning, marketing campaigns, music videos, playlist pitching.
- Recoupment and royalty statements.

## Milestone 6 — Distribution and Empire
- Own distribution company and publishing administration; sync licensing.
- Venues, events, management company, merch.
- Corporate dashboard for managing many businesses at once.

## Milestone 7 — Polish and Release Prep
- Replace placeholders with real pixel art, music and SFX.
- Tutorial / onboarding, balance passes using headless economy runs.
- Desktop packaging.
