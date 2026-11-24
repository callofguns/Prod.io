# Prod.io — Game Design Document

> Living document. Decisions marked **[LOCKED]** were confirmed by the project owner.
> Anything marked **[OPEN]** still needs a decision before it is built.

## 1. Vision

A 2D top-down business/tycoon sim set in the music industry, in the spirit of
*Big Ambitions*. You start as a broke bedroom producer and grow, at your own pace,
into a studio owner, label boss, distributor and finally an entertainment empire,
inside a living city where artists, producers, labels and trends move on without you.

Pillars:

1. **Hands-on first, management later.** Early game you make beats yourself; late
   game you run companies that make them for you. Automation is earned.
2. **Real-industry realism.** Money, contracts, royalties and platform payouts are
   modeled on the real music business, lightly tuned for fun.
3. **A living industry.** NPC artists release music, labels sign people, trends shift
   and competitors grow whether or not the player is involved.
4. **Interconnected systems.** Social media feeds beat sales, beat sales feed
   relationships, relationships feed placements, placements feed royalties, and so on.

## 2. Locked decisions

| Topic | Decision |
|---|---|
| Platform / tech | **[LOCKED]** Web, TypeScript + Phaser 4. Desktop packaging later. |
| Camera | **[LOCKED]** Top-down 3/4 view, walkable city and interiors. |
| Music production | **[LOCKED]** Hybrid: a playable simplified step-sequencer with real sounds, scored by skills, gear, loops, trend fit and the pattern itself. |
| Time | **[LOCKED]** Real-time with pause and 1x / 2x / 4x speeds. |
| Brands | **[LOCKED]** Fictional parodies (see §9). |
| Life sim | **[LOCKED]** Light needs: energy, hunger, happiness, rent and living costs. |
| City | **[LOCKED]** One fictional US-inspired city (Atlanta / LA / NYC mix). |
| Art | **[LOCKED]** Code-drawn placeholders first, real pixel art swapped in later. |
| UI style | **[LOCKED]** Retro pixel world + modern UI, designed with the `frontend-design` skill: a "studio hardware" look (see `docs/ARCHITECTURE.md`, UI design system). |
| Launch genres | **[LOCKED]** Hip-hop / Trap / Drill and R&B / Pop. |
| Economy | **[LOCKED]** Real-world based numbers. |
| Owner's role | **[LOCKED]** Playtesting and direction; Claude writes the code. |
| Title | **[LOCKED]** Prod.io |
| Player career | **[LOCKED]** Producer / executive only. The player never becomes a recording artist. |
| Character creation | **[LOCKED]** Name, producer alias, pixel-art appearance and a starting background. |
| NPC music | **[LOCKED]** NPC songs are data only; only the player's beats are audible. |
| Devices | **[LOCKED]** Desktop (keyboard + mouse) and iPhone. Changed from "desktop only" after Milestone 1. |
| Phone orientation | **[LOCKED]** Landscape only; a rotate notice covers portrait. |
| Touch controls | **[LOCKED]** Tap the floor to walk, tap furniture to walk over and use it; optional on-screen joystick in Settings. |
| Install | **[LOCKED]** Installable web app (Add to Home Screen): full screen, offline play. App Store not planned for now. |
| Difficulty | **[LOCKED]** One fixed start; only the chosen background changes starting conditions. |
| Saves | **[LOCKED]** One autosaved save per playthrough (saved each in-game day and on quit). |
| Sounds | **[LOCKED]** All instruments are synthesized in code (Web Audio); no sample files. |
| Food before the city | **[LOCKED]** A delivery app on the phone: groceries (cheap, cook at home) or takeout (instant, pricey). |
| Going broke | **[LOCKED]** Never game over: unpaid bills become debt with late fees and interest; loans exist. |
| Sleep | **[LOCKED]** Choose how long to sleep; the clock fast-forwards and energy refills. |
| Beat ratings | **[LOCKED]** 0-100 score with a letter grade (S/A/B/C/D/F), a part breakdown, tips and XP gained. |
| Pattern vs skills | **[LOCKED]** Skills first: each part is 30% pattern, 70% skill execution. |
| Learning | **[LOCKED]** XP from finishing beats, free tutorials (capped at skill 35) and paid MasterMix courses. |
| Trends | **[LOCKED]** Arrive with BeatHub (Milestone 1, update 6): they affect sales (appeal), not quality. BeatHub shows ranks and directions, not numbers. |
| BeatHub prices | **[LOCKED]** Store-wide price per lease tier, overridable per beat; higher prices sell less often. |
| Exclusives | **[LOCKED]** Offers arrive by phone; accept, decline or counter once (Business skill improves odds). |
| BeatHub plans | **[LOCKED]** Free: 30% fee, 10 listings. Pro: $19.99/month, 0% fee, unlimited listings. |
| Sales pace | **[LOCKED]** "Tight": steady work (2-3 beats a day) covers rent and food around weeks 3-4. |
| Selling tools | **[LOCKED]** Paid promotion only for now (free downloads and tags/SEO not planned yet). |
| City layout | **[LOCKED]** Separate walkable district maps (streets) with enterable buildings; travel between districts takes game time. Milestone 2 ships Eastside and Midtown. |
| Getting around | **[LOCKED]** Bus ($2.75, every 15 min, 6:00-0:00), Ryda rideshare from the phone (about $12-17, evening surge) or walking (40 min, a little tiring). |
| Gear | **[LOCKED]** Bought in person at Noise Depot (no online orders yet). Raises beat quality (×0.95 starter, up to about ×1.09) and makes beats faster. |
| Loops | **[LOCKED]** LoopVault credits plan; one loop slot per beat. A loop lifts the melody part; overused loops lower BeatHub uniqueness. |
| InstaSnap | **[LOCKED]** Beat snippet posts and paid boosts; followers and link taps send buyers to BeatHub. |
| ViewTube | **[LOCKED]** Type-beat uploads with an artist tag; views, subscribers and BeatHub link clicks. Ads only after 1,000 subscribers and 4,000 watch hours, paid monthly over $100. |
| World generation | **[LOCKED]** Mixed: a fixed cast of landmark NPCs/businesses plus seeded random NPCs and companies. |

## 3. Player

### 3.1 Needs (light)
- **Energy**: drains while awake and working; restored by sleep, coffee, energy drinks. Low energy reduces production quality and speed.
- **Hunger**: restored by food (groceries cheaper than takeout). Starving drains happiness and energy.
- **Happiness**: affected by success, social life, living conditions, overwork. Affects creativity (a production quality modifier).
- Living costs: rent (weekly), phone plan, subscriptions (DAW, LoopVault), food.

### 3.2 Skills
Skills rise with practice (XP from doing), tutorials (time and money), courses, and mentors
(an NPC with a high relationship). Each skill is 0–100 with diminishing returns.

| Skill | Affects |
|---|---|
| Drum Programming | Drum quality, bounce, genre authenticity |
| Melody & Composition | Melody/chord quality, hook potential |
| Sound Design | Sound selection quality, uniqueness, sample-pack quality |
| Mixing | Clarity, balance; big factor in a beat's sellable quality |
| Mastering | Loudness/polish; ceiling on commercial quality |
| Vocal Engineering | Recording and mixing artists (studio sessions) |
| Marketing | Social reach, post performance, campaign efficiency |
| Business & Negotiation | Contract terms, prices, deal success |
| Management | Employee efficiency, how many direct reports you can handle |

### 3.3 Reputation
Separate from money: **Producer Rep** (industry respect), **Public Fame** (followers,
audience), and per-genre **Scene Rep**. These unlock opportunities (bigger artists reply
to DMs, labels take meetings, venues book you).

## 4. Music production (hybrid)

### 4.1 Making a beat
At a computer (home or studio) the player opens the in-game DAW:
- A **step sequencer** (16 steps x N bars) with drum lanes (kick, snare/clap, hats,
  808, perc) and loop/melody slots filled from owned loops and sound kits.
- Settings: genre / subgenre, BPM, key, mood.
- Time cost: making a beat takes in-game hours, shortened by skill and gear.
- The player can also choose **Quick Produce** (no sequencer, uses skills only) to keep the
  late game from becoming tedious.

### 4.2 Quality score
A beat gets hidden sub-scores which combine into a visible rating:

```
quality = f(pattern score, skills, gear tier, loop/sample quality, energy & happiness)
appeal  = f(quality, trend fit for genre/subgenre/BPM, uniqueness, producer reputation)
```

- **Pattern score** checks the sequencer input against genre heuristics (e.g. trap hi-hat
  rolls and half-time snares; drill sliding 808s and syncopated snares; R&B swing).
- **Trend fit** compares the beat to the current market (§7.3).
- Every beat is saved as an item with its stats, ownership and license history.

**As built (Milestone 1, update 5):** the pattern is scored per part (drums, 808, melody,
mix, genre fit) against genre conventions, e.g. trap's half-time clap on step 9 and
hi-hat rolls, drill's 808 slides and off-beat snares, R&B swing and chords. Grooves that
are nearly identical to a stock starter count as generic. Each part is then 30% pattern +
70% execution from the relevant skills; the total is weighted by genre and multiplied by
needs (energy, food, mood) and gear (starter laptop: ×0.95), with ±3 session variance.

### 4.3 Gear
Laptop/PC tier, DAW tier, headphones, studio monitors, audio interface, microphone,
MIDI keyboard, acoustic treatment and plugins. Each item has a price, a quality bonus
and an unlock requirement. Bought at the music-gear store or online.

**As built (Milestone 2):** one item per slot counts (the best you own): computer, software, headphones,
speakers (need an audio interface), audio interface and MIDI keyboard. Quality bonuses add to the
starter ×0.95 (full setup about ×1.085, capped at ×1.10); speed factors multiply the time a beat takes
(full setup about 59%). Prices $89-$1,599.

### 4.4 Loops and samples
- **LoopVault** (Splice-like): monthly subscription for credits; each loop costs credits.
  Loops have a quality, genre, mood and *overuse* level (popular loops lower uniqueness).
- Uncleared samples raise the risk of a takedown or claim when a song blows up.
- Later the player can sell their own **sample packs and drum kits** (Sound Design skill).

**As built (Milestone 2):** Sounds plan $9.99/30 days for 25 credits (roll over up to 75 while
subscribed; credit pack 10 for $5.99). Loops cost 2-8 credits; 10 at launch, 3 new every Monday.
The loop plays in the beat's key; the melody part becomes 45% yours + 55% the loop's quality, and a
loop from another genre costs 10 genre-fit points. Overuse grows with a loop's popularity and age
(0 to its popularity over a few weeks) and cuts BeatHub uniqueness by up to 45%; two of your beats on
the same loop count as similar.

## 5. Beat selling

**BeatHub** (BeatStars-like) marketplace. License tiers with real-world style pricing:

| License | Typical price | Terms |
|---|---|---|
| MP3 Lease | $20–40 | Non-exclusive, stream cap (e.g. 50k) |
| WAV Lease | $40–80 | Non-exclusive, higher cap |
| Trackout Lease | $80–200 | Stems included |
| Unlimited Lease | $200–400 | No caps, still non-exclusive |
| Exclusive | $500–5,000+ | Beat removed from store; producer keeps publishing share and royalties per contract |

- Platform fee or subscription tiers.
- Sales are driven by beat appeal, store traffic, the player's ViewTube "type beat"
  channel, social posts and reputation.
- An NPC artist who leases a beat may release a song with it. If that song blows up,
  the player gains credits, reputation and (for exclusives or negotiated deals) royalties.

**As built (Milestone 1, update 6):** each hour, expected store sales =
0.09 × (Σ listing weights)^0.6 × reputation × marketing, split across listings by
weight. A listing's weight multiplies quality ((score/60)³), genre trend and tempo fit,
uniqueness against your other listings, a price factor (demand peaks for revenue at the
price buyers expect, which rises with quality and Business skill), promotion (×3) and
freshness (new uploads get pushed; listings fade to 40% over about a month). Buyers shop
more in the evening. Exclusive offers are a rare store-wide event aimed at beats scoring
58+, roughly $500-2,000 for an unknown producer. Free plan 30% fee and 10 listings; Pro
$19.99/month. Calibrated headlessly: a steady producer on Pro earns about $350 in week 3
and $450 in week 4 from leases.

## 6. Social media and platforms (the phone)

The phone is the main UI hub. Apps:

| App | Parody of | Purpose |
|---|---|---|
| InstaSnap | Instagram | Posts, stories, followers, DMs to artists |
| Chirp | X / Twitter | Industry news, trends, beef, announcements |
| ViewTube | YouTube | Type-beat channel, music videos, views, ad revenue, subscribers |
| Streamly | Spotify | Streams, monthly listeners, playlists, royalties |
| Pear Music | Apple Music | Streams (higher payout per stream, smaller audience) |
| CloudSound | SoundCloud | Underground discovery, early buzz, reposts |
| BeatHub | BeatStars | Beat store, leases, analytics |
| LoopVault | Splice | Loops, kits, credits |
| Bank | — | Balance, transactions, loans |
| Contacts / Messages | — | Relationships, collab requests, deals |
| Maps | — | City navigation, fast travel |

Each platform shows analytics: streams/views over time, top tracks, audience by city, revenue.

**As built (Milestone 2):** when you post, the post's totals are decided from the beat's score
(quality factor (score/60)³), your audience, trends, Marketing skill and luck, then fill in over time.
- InstaSnap: 22% of followers see a post plus about 70 Explore viewers for an average beat; extra posts
  within a day reach 60% as many each. Boosts: $10/$25/$50 for about 120 people reached per dollar.
  Snippets take 20 minutes. Starting followers depend on background (64 / 112 / 340).
- ViewTube: lifetime views ≈ 90 × quality^1.2 × tag heat × channel size boost + 12% of subscribers;
  most views in the first week, then a search tail for months; about 1% of uploads (more for great
  beats) get picked up by the algorithm for 8-25× the views. Tags are fictional artists whose buzz
  changes weekly; a tag from another genre gets 30% of the traffic. 1.5% of viewers open the BeatHub
  link; RPM $1.30 once in the Partner Program. Uploads take 45 minutes.
- Your total audience also lifts BeatHub traffic: × (1 + log10(1 + audience/100) / 5).
- Calibrated headlessly: a steady producer who posts and uploads every beat earns about 1.7-1.9× the
  BeatHub income of one who doesn't by week 8, with about 500 subscribers; monetization is a months-long goal.

### Approximate payout model (real-world based)
| Platform | Per stream / view |
|---|---|
| Streamly | ~$0.003–0.005 |
| Pear Music | ~$0.007–0.01 |
| CloudSound | ~$0.0025–0.004 (monetized accounts only) |
| ViewTube | ~$0.0005–0.002 per view (ad share) |

Distributors take a cut or a flat fee. Royalties arrive with a 1–2 month delay, like the real industry.

## 7. Living world

### 7.1 NPCs
Every industry NPC is an agent with: name, role (rapper, singer, producer, engineer, A&R,
label exec, manager), genre, skills, fame, money, personality traits, career goals, a
relationship graph and a career state machine (unknown, rising, buzzing, signed, star,
fading). NPCs release songs, sign deals, collaborate with each other and buy beats from
the player *and* from rival producers.

### 7.2 Relationships
Each relationship is a 0–100 stat with history. It rises from good collabs, paying on time,
gifts, studio hangs and shout-outs; it drops from ghosting, bad deals, broken contracts and
beef. It gates collabs, features, placements, rates and introductions (friends of friends).

### 7.3 Trends
Each genre and subgenre has a popularity curve that moves via a seeded random walk,
seasonal effects, viral events and the influence of hits (the player's hits included).
Trends also cover BPM ranges, sounds (e.g. sliding 808s, sped-up vocals) and moods.
Trends are visible but only partially, via charts, Chirp and "industry insight" reports
you can pay for.

### 7.4 Competitors
Rival producers sell beats on BeatHub; rival studios and labels compete for artists, studio
bookings and chart space. They grow, merge or go bankrupt.

### 7.5 Simulation detail levels
To keep thousands of NPCs cheap, the simulation runs at two levels:
- **Detailed (per minute)**: the player, NPCs in the current area, the player's businesses.
- **Abstract (per in-game day)**: the rest of the industry (releases, streams, deals).

## 8. Businesses and progression

| Stage | Unlock | Gameplay |
|---|---|---|
| 1. Bedroom producer | Start | Make and sell beats, build socials, buy loops and gear, pay rent |
| 2. Freelance producer | Rep + money | Custom beats, collabs, placements, sample packs, renting studio time |
| 3. Studio owner | Lease/buy a property | Furnish rooms, hourly bookings, hire engineers, maintenance |
| 4. Label owner | Company registration + capital | Sign artists, advances, recoupment, A&R, release campaigns, marketing budgets |
| 5. Distributor / publisher | Large catalog + capital | Distribute other labels, publishing admin, sync licensing |
| 6. Entertainment empire | Multiple companies | Venues, management company, merch, festivals, corporate dashboard |

The player can skip or linger in any stage (e.g. stay an elite independent producer).

### Shared business systems
- **Properties**: rent or buy, location affects price and foot traffic, renovations.
- **Employees**: hire with skills and wages, assign roles, morale, firing.
- **Automation**: employees and managers run routine tasks; the player sets policies
  (prices, budgets, release cadence).
- **Contracts**: a generic contract model used everywhere (leases, producer agreements,
  record deals, employment, distribution) with terms, splits, duration and breach rules.
- **Accounting**: a double-entry style ledger per company, taxes, loans, P&L reports.

### Contract realism (examples)
- Producer deals: flat fee + 2–5 "points" on the master + a publishing split.
- Record deals: advance recouped from artist royalty (traditional 15–20%, or 50/50 net profit deals), 360 deals, term/album commitments.
- Distribution: the distributor keeps 10–30% or a flat fee.

## 9. Parody names (draft)
InstaSnap (Instagram), Chirp (X), ViewTube (YouTube), Streamly (Spotify),
Pear Music (Apple Music), CloudSound (SoundCloud), BeatHub (BeatStars), LoopVault (Splice).
All names live in a single content file so they can be changed in one place.

## 10. City (draft)
One fictional city. Working name **Bayport**. Districts:
- **Eastside**: cheap apartments, where you start; corner stores, local rappers.
- **Midtown**: music stores, mid-range studios, cafés, CloudSound underground scene.
- **Downtown**: label offices, banks, real estate agency, high rents.
- **The Strip**: clubs, venues, nightlife; artists hang out here at night.
- **Arts District**: warehouses (cheap big spaces for studios), galleries, indie scene.
- **Hillside**: luxury homes and high-end studios (late game).

Getting around: walking, bus (cheap, slow), rideshare (fast, costs money), and later your own car.

**As built (Milestone 2):** Eastside (your building, Kwik Mart, bus stop, the road to Midtown) and
Midtown (Noise Depot, Grindhouse Café, bus stop, closed shops for later). Shops keep hours and send you
out at closing: Kwik Mart 7-23 (groceries cheaper than delivery, into your fridge), Noise Depot 10-20,
Grindhouse Café 7-19 (coffee for energy, food, an hour off for mood). The phone's Maps app lists places,
hours and Ryda rides.

## 11. Character creation
Name, producer alias, appearance (skin tone, hair, outfit from pixel-art parts) and a
**background** that sets starting skills and money. Draft backgrounds:
- **Self-taught**: higher Drum Programming and Sound Design, little money.
- **Music school dropout**: higher Melody & Composition and Mixing, student debt.
- **Club DJ**: higher Marketing and Scene Rep, contacts at The Strip, weaker production skills.

## 12. Open questions
- None right now. New ones will be added as milestones are planned.
