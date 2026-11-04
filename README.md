# POA Em Dobro+

A faster, friendlier way to browse the **POA em Dobro** 2-for-1 restaurant coupons in Porto Alegre.

The official app only shows coupons one by one. This project downloads all of them and serves a static web app where you can search, filter by category, neighbourhood, opening hours and day, see everything on a map, save favourites, and see **what changed** between updates.

The UI is in Brazilian Portuguese.

## How it works

```
 POA em Dobro API ──► scrape.py ──► data/*.json ──► React app (static)
                         │
                         └─► changes.py: diffs old vs new → data/changes/
```

1. **`scrape.py`** logs in to the app's API with a refresh token, downloads the coupon list and every coupon's details, and writes them to `data/`.
2. **`changes.py`** compares the new data with the previous run and records what was added, removed or changed.
3. **The web app** (`src/`) is plain static files. It reads the JSON from `data/`. There is no backend.
4. **GitHub Actions** runs the scraper every 6 hours and commits the new data, but only when something actually changed.

## Quick start

Requirements: Node 20+, Python 3.12+.

```bash
npm install                      # .npmrc already sets legacy-peer-deps
npm run dev                      # http://localhost:5173
```

The repo already includes data, so the app works without running the scraper.

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

It commits `data/` only when `data/changes/` or `data/config.json` changed. Fields that change on every run, like "open now", never cause a commit.

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
| `npm run dev` | Dev server |
| `npm run build` | Production build into `dist/`, including `dist/data/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run update` | Run the scraper |
| `node src/lib/markers.test.mjs` | The only test right now |

## Deploying

`npm run build` produces a self-contained static site in `dist/`. Any static host works. When new data is deployed, open tabs notice within 10 minutes by checking `meta.json` and show a small "updated" toast.
