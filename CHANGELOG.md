# Changelog

Each release is a git tag on `main`. Versions follow `v<major>-beta.<n>` during
the beta, then semantic versioning (`v1.0.0`, `v1.1.0`, ...) from the first full release.

## v1-beta.7

Play on iPhone: touch controls, landscape layout and an installable offline web app.

- iPhone support (landscape):
  - Tap the floor to walk there; tap furniture to walk over and use it. Also works with a
    mouse on desktop. Tap the "Use ..." prompt to open its menu.
  - Optional on-screen joystick (Settings → Controls).
  - Every screen fits a landscape phone: a slim HUD, the phone as a side sheet, a compact
    beat maker with bigger pads, and menus that scroll. Clear of the notch and home bar.
  - The room is drawn at the screen's real pixel density: crisp pixel art, whole room visible.
  - Turning a phone upright shows a "turn your phone sideways" card and pauses the game.
  - Developer tools setting shows a DBG button for the debug panel.
- Installable: Add to Home Screen gives a full-screen app with its own icon that plays
  offline.
- Settings → Save data: export your save as a file, or import one from the title screen.
- Fixed: the title screen's buttons overlapping the logo (since v1-beta.4) and a faint
  box inside every LCD readout (since v1-beta.6), both caused by clashing style names.

## v1-beta.6

BeatHub selling (Milestone 1, update 6). Milestone 1, Bedroom Producer, is complete.

- BeatHub app on the phone: sell your finished beats.
  - List beats and sell MP3, WAV, Trackout and Unlimited leases. Set store-wide prices
    and override them per beat; higher prices sell less often.
  - Sales come in over time, more in the evening. What sells depends on quality, genre
    trends and tempo, price, how different your beats are from each other, freshness
    (new uploads get pushed), store reputation and your Marketing skill.
  - Free plan (BeatHub keeps 30%, 10 listings) or Pro ($19.99/month, keep 100%, unlimited).
  - Paid promotion: 3, 7 or 14 days for about three times the plays.
  - Exclusive offers from artists for your better beats (score 58+): accept, decline or
    counter once. Your Business skill improves the odds of a counter.
  - Store stats: plays, sales and earnings for the last 7 days, earnings per day as a
    chart (or a table), and per-beat stats.
  - Trends tab: genres ranked by popularity with direction and popular tempo, updated
    every Monday, plus a weekly summary message.
- Sale and offer notices; the beat library shows each beat's store status.
- Debug panel: add 5 test beats, or trigger an exclusive offer.
- Saves upgrade automatically.

## v1-beta.5

The beat maker (Milestone 1, update 4) and beat ratings, skills and studying (update 5).

- Beat maker: use the computer to open a 16-step groovebox.
  - Drums page: kick, snare, clap, hi-hat (with ×2/×3/×4 rolls), open hat and perc.
  - 808 page: a note roll in your key with slides between notes.
  - Melody page: a note roll with chords and four instruments (keys, pluck, bell, pad).
  - Genre (Trap, Drill, R&B, Pop), BPM, swing, key and scale; a starter groove per genre.
  - All sounds are synthesized in the browser. Space plays and stops.
- The clock stops while you compose. "Finish beat" takes in-game hours based on your
  skills and needs, fast-forwards, uses extra energy and lifts your mood.
- Library of finished beats: play them back or use one as a starting point.
- Your work in progress is kept when you close the beat maker.
- Volume setting.
- Saves from v1-beta.4 upgrade automatically.
- Beat ratings: every finished beat gets a 0-100 score and a grade (S to F), a breakdown
  (drums, 808, melody, mix, genre fit), what works, what to fix, and the skill holding it
  back. Your skills count most; the pattern you program nudges the score.
- Stock starter grooves count as generic until you change them.
- Skills grow from finishing beats, with diminishing returns at higher levels. Level-ups
  pop up as notices.
- Study at the computer: free ViewTube tutorials (1 hour, up to skill 35) and nine paid
  MasterMix courses ($49 to $299) taken in 2-hour sessions.
- Profile app on the phone: your skills, courses and best beat.
- The beat library shows each beat's grade and its report.
- Debug panel: raise or lower all skills.
- Saves upgrade automatically; older beats are rated with your current skills.

## v1-beta.4

Needs, sleep, food, rent and debt (Milestone 1, update 3).

- Needs: Energy, Food and Mood, shown as LED meters on the HUD. Low levels hurt your mood;
  at zero energy you pass out wherever you are.
- Press E on objects for a menu of actions (number keys pick one).
- Sleep in bed until 7:00, until 9:00, 8 hours, or a 2-hour nap. Time fast-forwards while
  you sleep, and a full night improves your mood.
- Food: cook at the stove, snack or eat takeout from the fridge, drink energy drinks.
- DashBite app: order groceries and takeout; deliveries arrive in 30 to 50 minutes.
- Rent ($265 every Monday from week two) and a $45 monthly phone plan, paid automatically.
- Student loan payments on the 1st with monthly interest.
- Never game over: unpaid bills become overdue debt with late fees (collected when you can
  afford it), and missed payments drop your credit score.
- Bank app: credit score, upcoming bills, and personal loans priced by your credit.
- Saves from v1-beta.3 upgrade automatically.

## v1-beta.3

Phone and bank (Milestone 1, update 2), pause menu and settings.

- Hid the "Powered by Netlify" badge on the live site.
- Pause menu (Esc or the menu button): resume, settings, save and quit to title, and the
  game version. The clock stops while it's open.
- Settings (from the title screen or pause menu): world zoom, control hints, reduce motion,
  and pausing when you leave the tab. Saved per browser.
- Phone (P key or the phone button): a home screen with app icons and an unread badge.
- Bank app: balance, money in and out over the last 7 days, debts, and every transaction.
- Messages app: an inbox with read/unread, starting with welcome messages that depend on
  your background (e.g. the student loan notice for Music school dropouts).
- Saves from v1-beta.2 upgrade automatically (the bank history starts from your current balance).

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
