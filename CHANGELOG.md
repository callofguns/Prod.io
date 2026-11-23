# Changelog

Each release is a git tag on `main`. Versions follow `v<major>-beta.<n>` during
the beta, then semantic versioning (`v1.0.0`, `v1.1.0`, ...) from the first full release.

## Unreleased

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
