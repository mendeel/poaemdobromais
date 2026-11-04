# POA Em Dobro+

A faster, friendlier way to browse the **POA em Dobro** 2-for-1 restaurant coupons in Porto Alegre.

The official app only shows coupons one by one. This project downloads all of them and serves a web app where you can search, filter by category, neighbourhood, opening hours and day, see everything on a map, save favourites, see **what changed** between updates, and **rate** each place (1–5 stars for atendimento, comida and ambiente, no login needed).

Live at <https://poaemdobro.mendel.vip>, hosted on Cloudflare Workers.

The UI is in Brazilian Portuguese.

## How it works

```
 POA em Dobro API ──► scrape.py ──► data/*.json ──► React app (static assets)
                         │                                │
                         └─► changes.py: diffs old vs     └─► /api/ratings ──► Worker ──► D1 (ratings)
                             new → data/changes/
```

1. **`scrape.py`** logs in to the app's API with a refresh token, downloads the coupon list and every coupon's details, and writes them to `data/`.
2. **`changes.py`** compares the new data with the previous run and records what was added, removed or changed.
3. **The web app** (`src/`) is static files. It reads the JSON from `data/`.
4. **The ratings API** (`worker/index.js`) is the only server code: a small Cloudflare Worker with a D1 (SQLite) database. Everything else is served as static assets without running the Worker.
5. **GitHub Actions** runs the scraper every 6 hours and commits the new data, but only when something actually changed. Each data commit and each code push to `main` deploys the site.

### Ratings

- People rate a place with 1–5 stars in each of three categories: atendimento, comida, ambiente. All three are required.
- Only places marked **"Já fui aqui"** in the detail view can be rated. Marking one opens the rating form right away. "Agora não" skips it, and "Avaliar agora" comes back later. The mark can be undone until the place is rated. Without a login this is enforced in the browser, not by the API.
- Cards and map popups show the overall score (the mean of the three category averages) and the vote count. The detail view shows each category.
- No login. The browser keeps a random voter id in localStorage, so voting again on the same place replaces the earlier vote.
- Abuse limit: 60 votes per IP per day. Only a salted SHA-256 hash of the IP is stored.
- `GET /api/ratings` returns every place's averages in one JSON and is cached for 60 s per Cloudflare location. `POST /api/ratings/:id` saves a vote.

## Quick start

Requirements: Node 20+, Python 3.12+.

```bash
npm install                      # .npmrc already sets legacy-peer-deps
npm run db:migrate:local         # once: creates the local ratings database
npm run dev                      # http://localhost:5173
```

The repo already includes data, so the app works without running the scraper. `npm run dev` also runs the ratings Worker with a local D1 database (stored in `.wrangler/`, never touching production).

### Updating the data locally

```bash
pip install -r requirements.txt
# create .env first (see Configuration below)
npm run update                   # same as: python3 scrape.py
```

Options:

| Flag | When to use it |
|---|---|
| `--resume` | Some coupon details failed. This reuses the cached list instead of fetching it again. |
| `--allow-shrink` | The coupon count dropped by more than 40% and that drop is real. |

To compare any two datasets by hand: `python changes.py OLD.json[.gz] NEW.json[.gz]`

## Configuration (`.env`)

| Variable | Required | Purpose |
|---|---|---|
| `REFRESH_TOKEN` | yes | API refresh token. **It changes every time it's used**: the script saves the new one back to `.env` on its own. |
| `X_TOKEN` | yes | Static API header taken from the mobile app |
| `DEVICE_ID` | | `deviceid` header |
| `BASE_URL` | | API base URL |
| `LAT`, `LNG` | | Location sent with the coupon list request |
| `DATA_DIR` | | Output folder (default `data`) |
| `MAX_WORKERS` | | Number of detail requests run in parallel (default `10`) |
| `API_HOST`, `APP_TENANT`, `APP_VERSION`, `USER_AGENT` | | Overrides for the request headers that imitate the app |
| `VITE_CARTO_KEY` | | Free [CARTO basemaps](https://carto.com/basemaps/apikey) key for the map tiles. It is read when the app is built. |
| `GH_PAT` | CI only | Lets the workflow save the new refresh token as a repo secret |

**If the refresh token is rejected** (HTTP 401/403), open the POA em Dobro app on your phone with Proxyman intercepting its traffic. Copy the new `refreshToken` into `.env`, and into the `REFRESH_TOKEN` GitHub secret.

## Automatic updates (GitHub Actions)

`.github/workflows/update-data.yml` runs at minute 17 every 6 hours (UTC). You can also start it by hand from the Actions tab.

Repo secrets it needs: `REFRESH_TOKEN`, `X_TOKEN`, `DEVICE_ID`, `LAT`, `LNG`, `BASE_URL`, `GH_PAT`.

It commits `data/` only when `data/changes/` or `data/config.json` changed. Fields that change on every run, like "open now", never cause a commit. After a commit it calls `deploy.yml` to publish the new data.

`.github/workflows/deploy.yml` builds, runs the tests and deploys to Cloudflare. It runs on pushes to `main` (except docs-only changes), after each data commit, or by hand from the Actions tab. Repo secrets it needs:

| Secret | What it is |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token from the **Edit Cloudflare Workers** template, scoped to this account and the `mendel.vip` zone |
| `VITE_CARTO_KEY` | Same value as in `.env`. It's baked into the build, so without it the map shows a watermark. |

The account id is in `wrangler.jsonc`. The job refuses to deploy while `wrangler.jsonc` has no `database_id`, so it can't create duplicate databases before the first manual deploy (see below).

## Project layout

```
scrape.py              Downloads coupons, applies safety checks, writes data/
changes.py             Diff logic (which fields count, noise filters)
data/
  all_cupoms.json      Every coupon with full details. The app's main dataset.
  config.json          Filter options from the API (categories, features, regions)
  meta.json            { updatedAt, checkedAt, count }. The app polls this file.
  list_raw.json        Raw list output, used by --resume
  changes/index.json   Update history, newest first (summary counts)
  changes/<id>.json    Full changelog for one update
  snapshots/<id>.json.gz  Full dataset at each update that had changes
public/data → ../data  Symlink, so Vite serves and bundles the data
worker/index.js        Ratings API (Cloudflare Worker)
migrations/            D1 schema migrations for the ratings database
wrangler.jsonc         Worker config: name, account, custom domain, D1 binding
.github/workflows/     update-data.yml (scraper every 6h), deploy.yml (build + deploy)
src/
  App.jsx              Loads data, wires filters and views together
  components/          Sidebar, Topbar, CardGrid/Card, MapView, CupomModal, ChangesPanel…
  lib/                 Pure logic: filters, schedule (open/closed), diff, markers
  hooks/               Clock, favourites, changelog loading, data-version polling
  state/useFilters.js  Filter reducer
docs/superpowers/      Design spec and plan for the map view
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server, with the ratings Worker and a local D1 |
| `npm run build` | Production build: site in `dist/client/` (including `data/`), Worker in `dist/poaemdobromais/` |
| `npm run preview` | Serve the build locally |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run db:migrate:local` | Apply `migrations/` to the local D1 |
| `npm run db:migrate` | Apply `migrations/` to the production D1 |
| `npm run update` | Run the scraper |
| `npm test` | Unit tests (`src/lib/*.test.mjs`) |

## Deploying

The site runs on **Cloudflare Workers** (free plan): Worker `poaemdobromais`, custom domain `poaemdobro.mendel.vip`, configured in `wrangler.jsonc`. Static files are served as Worker static assets, and only `/api/*` runs the Worker code.

Deploys normally happen in GitHub Actions (see above). To deploy from your machine:

```bash
npx wrangler login               # once
npm run deploy                   # build + wrangler deploy
```

When new data is deployed, open tabs notice within 10 minutes by checking `meta.json` and show a small "updated" toast.

**First deploy of the ratings database** (only once, from your machine):

1. `npx wrangler secret put IP_SALT` and paste a long random value (for example the output of `openssl rand -hex 32`). It salts the stored IP hashes. Changing it later only resets the daily vote limit.
2. `npm run deploy`. Wrangler creates the D1 database `poaemdobromais-ratings` and writes its `database_id` into `wrangler.jsonc`. Commit that change.
3. `npm run db:migrate` to create the table.

Schema changes go in a new numbered file in `migrations/`. Apply it with `npm run db:migrate:local` and, before deploying code that needs it, `npm run db:migrate`.
