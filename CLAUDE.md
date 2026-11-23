# Working on Prod.io

## Git workflow (set by the project owner)
- Every update gets its own feature branch off `main`: `feature/<short-name>`
  (or `fix/<short-name>` for bug fixes).
- When the update is done and checks pass, merge it into `main` with
  `git merge --no-ff` and push both the branch and `main`.
- Count the merged updates since the last release tag. After every two or so,
  **ask the owner whether to tag a release** and propose the next version number.
  Never tag without asking.
- Release tags live on `main`. During the beta: `v1-beta`, `v1-beta.2`, `v1-beta.3`, ...
  When tagging, also bump `version` in `package.json` (`1.0.0-beta.2` displays as
  `v1-beta.2`) and add a section to `CHANGELOG.md`.

## Hosting (Netlify)
- Site: `prod-io-game` (site id `a9f86737-9542-49f5-a403-551a89329bbd`), https://prod-io-game.netlify.app
- **Redeploy after every update merged into `main`**, from a clean checkout of `main`,
  using the Netlify MCP `deploy-site` operation (it returns a fresh upload command each time).
- Build settings live in `netlify.toml`. Visitor access is the owner's call; don't change it unasked.

## Checks before merging
`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and play the change
in a browser (Playwright screenshots) when it touches the game or UI.

## Project rules
- Read `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` first.
- `src/sim` stays free of Phaser, DOM, UI and save code (enforced by ESLint).
- Money is integer cents. Brand names are parodies and live in one content file.
- UI follows the "studio hardware" design system in `docs/ARCHITECTURE.md`.
- The owner playtests and decides direction; ask about anything not settled in the docs.
