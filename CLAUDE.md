# CLAUDE.md

Context for AI assistants. Read this before you explore. `README.md` covers setup and the user-facing overview.

## What this is

A React app for browsing the **POA em Dobro** 2-for-1 restaurant coupons (Porto Alegre). A Python scraper pulls the coupons from the mobile app's private API into `data/*.json`, and the app reads those files. The only server code is a small **ratings API** (Cloudflare Worker + D1).

- Frontend: React 19, Vite 8, Tailwind v4 (`@theme` tokens in `src/index.css`), `motion`, `lucide-react`, `react-leaflet` with `react-leaflet-cluster`
- Hosting: Cloudflare Workers, free plan. Worker `poaemdobromais`, custom domain `poaemdobro.mendel.vip`, config in `wrangler.jsonc`. Built with `@cloudflare/vite-plugin`. Deploys come from **Cloudflare Workers Builds**, the Git integration configured in the Cloudflare dashboard, not in this repo. It runs `npm run build` and then `npx wrangler deploy` on every push to `main`, including the CI data commits. Other branches get preview versions. `VITE_CARTO_KEY` is a build variable there. Don't add a GitHub Actions deploy, because it would deploy twice.
- Ratings API + link previews for `/r/*`: `worker/index.js` with D1 binding `DB` (database `poaemdobromais-ratings`) and assets binding `ASSETS`, schema in `migrations/`
- Scraper: Python 3.12, `requests`, `python-dotenv`. Only two files: `scrape.py` and `changes.py`.
- CI: `.github/workflows/update-data.yml` runs the scraper every 6h, commits only real changes (Workers Builds then deploys them)
- Plain JS/JSX, no TypeScript, no linter config. Tests: `npm test` (`src/lib/*.test.mjs`, plain `node:assert`).

## Commands

```bash
npm run dev            # dev server + ratings Worker with a local D1 (.wrangler/)
npm run build          # → dist/client (site + data via the public/data symlink), dist/poaemdobromais (Worker)
npm run deploy         # build + wrangler deploy to production
npm run db:migrate:local   # apply migrations/ to the local D1 (needed once before dev)
npm run db:migrate         # apply migrations/ to the production D1
npm test
npm run update         # python3 scrape.py  (needs .env)
python3 scrape.py --resume        # reuse data/list_raw.json after detail failures
python3 scrape.py --allow-shrink  # accept a drop of more than 40% in coupon count
python3 changes.py OLD.json[.gz] NEW.json[.gz]   # print a diff report
node src/lib/markers.test.mjs
```

Don't run `scrape.py` unless the user asks. It calls a real API, rotates the refresh token in `.env`, and rewrites `data/`.

Don't run `npm run deploy`, `npm run db:migrate`, `wrangler secret put` or any `--remote` D1 command unless the user asks. They change production.

**GitHub CLI:** the repo belongs to the `mendeel` account, but the machine's active `gh` account is another one. Never run `gh auth switch`. Pass mendeel's token per command, which leaves the active account untouched: `GH_TOKEN=$(gh auth token -u mendeel) gh <command> --repo mendeel/poaemdobromais`. Never print the token.

## Data flow

```
API ─► scrape.py ─► data/all_cupoms.json, config.json, meta.json, list_raw.json
          └─► changes.diff_cupoms(prev, new) ─► data/changes/<id>.json + index.json
                                              └─► data/snapshots/<id>.json.gz
App: fetch('/data/…', {cache:'no-cache'})   (absolute paths; public/data → ../data symlink)
App: fetch('/api/ratings') ─► worker/index.js ─► D1 `ratings` table
```

### Link previews (worker/index.js)

- `/r/*` also runs the Worker. `cupomPage()` fetches the app shell from the `ASSETS` binding and uses `HTMLRewriter` to swap the `<title>`, description, `og:*` and `twitter:*` tags for that place's own (name, offer + bairros, photo), so WhatsApp etc. show a real preview. Unknown ids get the plain shell, and any failure falls back to it.
- The Worker doesn't parse `all_cupoms.json`. `vite.config.js` turns it into the virtual module `virtual:og-index` (`ogIndex()` in `src/lib/og.js`, about 90 KB) at build time. Each data commit triggers a Workers Builds build, so previews stay current. In `vite dev`, restart after the data changes.
- The default tags in `index.html` are what the home page and unknown links show. The Worker removes them before adding its own, so keep them as plain `<meta name|property=…>` tags.

### Ratings (worker/index.js)

- Only `/api/*` and `/r/*` run the Worker (`assets.run_worker_first`). Everything else is a static asset.
- `GET /api/ratings` → `{ [cupomId]: { n, atendimento, comida, ambiente } }`: averages rounded to 2 decimals, places without votes left out. Cached for 60 s with the Cache API. A POST deletes the cached copy in its own colo.
- `POST /api/ratings/:id` with `{ voterId, atendimento, comida, ambiente }`. It must be `Content-Type: application/json`, which forces a CORS preflight for cross-site posts. All three scores are required, integers 1–5. It upserts on `(cupom_id, voter_id)` and returns that place's new aggregate.
- Anonymous: `voterId` is 32 random hex chars kept in localStorage. The limit is 60 votes per IP per 24h, counted on `ip_hash` (SHA-256 of the `IP_SALT` secret + `CF-Connecting-IP`). Raw IPs are never stored.
- Overall score = mean of the three category means. Because every vote has all three scores, this equals the mean of each voter's own average.
- Validation and labels live in `src/lib/ratings.js`, which both the app and the Worker import. A new category means changing `CATEGORIES`, adding a migration for the column, and updating `parseVote` tests.
- The app treats the API as optional: if it fails, no stars are shown and nothing else breaks.
- **Rating requires "Já fui"**: `RatingSection` shows the vote form only for places in `betterped:visited` (`useVisited`) or ones the visitor already rated. A past vote counts as a visit and locks it, so there's no "Desfazer". Marking a visit opens the form, and "Agora não" closes it. This is UI-only: the Worker can't check visits without login, and the per-IP limit is the only server-side guard.
- Cards also have a "Já fui" toggle next to the heart. `App.jsx` builds `visitedAll` (visited ∪ rated ids), which drives the card pill and the "Já fui" filter. On a rated place the card toggle is locked, same as in the modal. Marking a visit from a card opens `RateModal` (the same `RatingForm`, with "Agora não"), so places can be rated without opening each one. Unmarking just toggles.

### scrape.py

1. `refresh_token()` POSTs to `/api/v3/auth/refresh-token`. **The API rotates refresh tokens**, so the new one is written back to `.env` with `set_key`. A 401/403 means a human has to capture a fresh token from the phone app with Proxyman.
2. `fetch_all_list_items()` pages through `/api/v2/cupom?lat&lng&page` until a page comes back empty. It drops `tipo == "P"` (sponsored banners) and removes duplicate ids.
3. Coupon details come from `/api/v2/cupom/{id}?flag=true` in a thread pool. Each request is retried 3 times.
4. **Safety checks: if any fails, nothing is written.** The checks are: the list is empty; the list shrank below 60% of the previous run (unless `--allow-shrink`); or any detail request failed (`list_raw.json` is still saved so `--resume` can pick up from there).
5. Diff against the previous `all_cupoms.json`. If there are changes, it writes the changelog, the index and a gz snapshot. If not, `meta.updatedAt` keeps the old stamp and only `checkedAt` moves.
6. `update_config()` refreshes `config.json` (`caracteristica`, `subCategoria`, `regiao`). If that fails, the run continues.
7. Every JSON file is written atomically (`.tmp` file, then `os.replace`), with `ensure_ascii=False, indent=2`.

Timestamps are in BRT (`-03:00`), for example `2026-11-03T19:23-03:00`. Changelog and snapshot ids are `stamp[:16]` without colons: `2026-11-03T1923`.

### changes.py (diff rules)

- Only fields people care about are compared: `TEXT_FIELDS` (nome, descricao, beneficio, regra, validade, telefone, instagram), sub_categoria, caracteristica, image, and per-unit (`endereco[]`, keyed by `lugar_codigo`) address and hours, plus units that opened or closed.
- Fields that change on every API request are **ignored**: `aberto`, `today`, `distancia`, `favorito`, `notWorking`…
- Noise filters, each added on purpose after a false positive:
  - Text is compared case-, punctuation- and whitespace-insensitively (`_same_text`), and the "(ver regras)" suffix is ignored.
  - A `regra` change is dropped when every word it changed also changed in `descricao` (`_echoes`).
  - Daily hours merge contiguous lunch/dinner periods before comparing, because the API re-splits the same hours in different ways.
- Change entry shape: `{field, label, before, after}`. Changelog file: `{id, from, to, added[], removed[], changed[]}`. `added` and `removed` hold `_summary()` objects. `changed` holds `{id, nome, logo, changes[]}`.

## Domain gotchas (important)

- **API `horario` times are GMT.** Shift them by −3h for local time. This logic exists in **two places that must stay in sync**: `src/lib/schedule.js` (`API_TZ_OFFSET_MIN`) and `changes.py` (`API_TZ_OFFSET_MIN`).
- **Days are numbered 1 = Seg … 7 = Dom.** Index 0 is unused (`src/lib/constants.js`, `changes.DAY_NAMES`). JS `getDay()` is converted in `todayDay()`.
- **Hours structure:** `endereco[i].horario[period][day].horario = "HH:MM - HH:MM"` or `"-"`, where period `A` is lunch and `J` is dinner. Overnight ranges (end ≤ start) spill into the next day, and `isOpenAtAddress` checks the previous day for them.
- A coupon is "open" if **any** of its `endereco` units is open.
- `sub_categoria` is a comma-separated string. `caracteristica` on a coupon is an array of name strings. In `config.json` it is an array of objects.
- Coordinates: each unit has `latitude`/`longitude`, and the coupon has top-level `lat`/`lng` as a fallback (`lib/markers.js`).
- `regraResumo()` (`lib/regra.js`) keeps the product-specific lines of `regra` and stops at the first generic line ("LEIA COM ATENÇÃO", "Válido de…"). It is used on cards and map popups.

## Frontend map

| Concern | Where |
|---|---|
| Data loading, reload on new version, derived filter options | `src/App.jsx` |
| Filter state (reducer: `set`, `toggleSet`, `preset`, `customTime`, `clear`) | `src/state/useFilters.js` |
| Filtering and sorting, incl. "Já fui", minimum score and "Melhor nota" (pure function) | `src/lib/filters.js` (`applyFilters`, `PRESET_WINDOWS`) |
| Shareable cupom URLs `/r/<id>-<slug>` (only the id is read) | `src/lib/cupomUrl.js` |
| Open cupom ↔ URL (pushState, back button closes the modal) | `src/hooks/useCupomRoute.js` |
| Open/closed and hours display | `src/lib/schedule.js` |
| Changelog loading, "Novo" badge + "Novidades" filter (additions only; edits live in the panel), unseen dot | `src/hooks/useChanges.js` |
| Polls `meta.json` every 10 min and on tab focus, triggers a reload and toast | `src/hooks/useDataVersion.js` |
| Favourites and "Já fui" visits (localStorage id sets) | `src/hooks/useLocalStorage.js` |
| Ratings fetch/submit, voter id, own votes | `src/hooks/useRatings.js` |
| Star display/input, `RatingBadge` (cards, map popup) | `src/components/ui/Stars.jsx` |
| Category breakdown, "Já fui" button, vote form (`RatingForm`) in the modal | `src/components/RatingSection.jsx` |
| Quick rating sheet opened by a card's "Já fui" | `src/components/RateModal.jsx` |
| Live clock (ticks each minute) | `src/hooks/useNow.js` |
| Word-level diff for the "O que mudou" panel | `src/lib/textDiff.js` |
| Changes panel. `GROUPS` maps changes.py `field` names to filter chips | `src/components/ChangesPanel.jsx` |
| Map (CARTO Voyager tiles, clustering, start view) | `src/components/MapView.jsx`, `mapIcon.js` |
| Grid with batched infinite render (24 per batch) | `src/components/CardGrid.jsx` |

localStorage keys: `betterped:favorites`, `betterped:lastSeenChange`, `betterped:voterId`, `betterped:myRatings`, `betterped:visited`.

### Frontend gotchas

- **Adding a change field in `changes.py`?** Also add it to `GROUPS` in `ChangesPanel.jsx`, or it won't appear under any chip.
- `react-leaflet-cluster` is CJS. `MapView.jsx` unwraps `.default`, and `.npmrc` sets `legacy-peer-deps`. Keep both.
- `mapIcon.js` uses inline styles with the theme colours duplicated, because Tailwind classes don't reach Leaflet's DOM. Update them if the theme changes.
- Map tiles need `VITE_CARTO_KEY`, which is read at build time. Keep the OSM/CARTO attribution.
- Scrolling: on **mobile the document scrolls** (so tapping the iOS status bar scrolls to top). On **desktop it's a fixed shell with internal scroll**. `html, body` use `overflow-x: clip`. Do **not** change that to `hidden`, because it breaks the sticky topbar and status-bar scrolling.
- Cards are a fixed 366px tall (`.cv-auto` `contain-intrinsic-size`). If card height changes, update that value too.
- `filterKey` in `App.jsx` re-runs the grid entrance animation. It deliberately leaves out `favorites` and `now`.
- Overlays sit above Leaflet's panes. The z-index order is: drawer 800/900 < toast 1400 < changes panel 1500 < rate modal 1900 < cupom modal 2000. The modal must stay on top because it opens from inside the panel and the map.
- Mobile inputs are forced to 16px so iOS doesn't zoom on focus.
- `vite.config.js` `allowedHosts` lists an ngrok domain used to share the dev/preview server.
- `playwright-core` is a devDependency that the source doesn't use. It's there for ad-hoc browser checks and screenshots (`chromium.launch({ channel: 'chrome' })` uses the installed Chrome).
- The card footer holds the hours (truncated) and the `RatingBadge`. Keep the badge in that row so the card stays 366px tall.
- Cupom links are real paths (`/r/123-nome`), served by `assets.not_found_handling: "single-page-application"` in `wrangler.jsonc`. So every `fetch` must use an absolute path (`/data/…`, `/api/…`): a relative one would resolve under `/r/` and get `index.html` back.
- Closing the modal calls `history.back()` when the modal was opened in the app, and `replaceState('/')` when the visitor landed on a shared link. A link to a cupom that no longer exists falls back to `/`.
- `wrangler.jsonc` sets the custom domain under `routes`. Keep it there so every deploy keeps the domain attached to the Worker.

## Conventions

- **UI text and user-facing script messages are in Portuguese (pt-BR). Code comments and identifiers are in English.** Domain names stay as the API has them (`cupom`, `endereco`, `bairro`, `regra`, `horario`…).
- Comments are sparse and explain *why*. Match that style.
- Keep logic in `src/lib/` as pure functions. Components stay presentational.
- Tailwind utility classes use the theme tokens (`text-fg`, `text-fg-muted`, `bg-primary`, `border-brd`, `font-display`…). Fonts are Karla (sans) and Playfair Display SC (display).
- Commits follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `ci:`, `chore(data):`. CI uses `chore(data): atualização automática …`.
- Never commit `.env` (it holds API tokens, `GH_PAT` and the CARTO key). Never print its values. Worker secrets (`IP_SALT`) live only in Cloudflare; for local dev use an optional, git-ignored `.dev.vars`.
- D1 schema changes go in a new numbered `migrations/NNNN_*.sql` file. Never edit an applied migration.
- `data/` is committed and is the published dataset. Don't hand-edit it. Regenerate it with the scraper.
