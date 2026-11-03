import argparse
import gzip
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

import requests
from dotenv import load_dotenv, set_key

from changes import diff_cupoms, print_report

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(ENV_PATH, override=True)


# ── config ──────────────────────────────────────────────────────────────────
def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Missing required environment variable: {name}")
    return value


REFRESH_TOKEN = _require_env("REFRESH_TOKEN")
X_TOKEN = _require_env("X_TOKEN")
DEVICE_ID = os.environ.get("DEVICE_ID")
LAT = os.environ.get("LAT")
LNG = os.environ.get("LNG")
BASE_URL = os.environ.get("BASE_URL")
DATA_DIR = os.environ.get("DATA_DIR", "data")
MAX_WORKERS = int(os.environ.get("MAX_WORKERS", "10"))
RETRIES = 3
ALL_CUPOMS_PATH = os.path.join(DATA_DIR, "all_cupoms.json")
LIST_RAW_PATH = os.path.join(DATA_DIR, "list_raw.json")
META_PATH = os.path.join(DATA_DIR, "meta.json")
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
SNAPSHOTS_DIR = os.path.join(DATA_DIR, "snapshots")
CHANGES_DIR = os.path.join(DATA_DIR, "changes")
CHANGES_INDEX_PATH = os.path.join(CHANGES_DIR, "index.json")
BRT = timezone(timedelta(hours=-3))

STATIC_HEADERS = {
    "Host": os.environ.get("API_HOST", "api.brasilemdobro.com.br"),
    "x-token": X_TOKEN,
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "deviceid": DEVICE_ID,
    "x-app-tenant": os.environ.get("APP_TENANT", "poa"),
    "User-Agent": os.environ.get(
        "USER_AGENT",
        "POA%20em%20Dobro/3 CFNetwork/3860.600.12 Darwin/25.5.0",
    ),
    "Connection": "keep-alive",
    "x-app-version": os.environ.get("APP_VERSION", "1.3.25"),
    "Accept": "application/json, text/plain, */*",
}
# ─────────────────────────────────────────────────────────────────────────────


def log(tag: str, msg: str) -> None:
    ts = time.strftime("%H:%M:%S")
    print(f"{ts} [{tag}] {msg}", flush=True)


def refresh_token() -> str:
    url = f"{BASE_URL}/api/v3/auth/refresh-token"
    headers = {**STATIC_HEADERS, "Content-Type": "application/json"}
    log("auth", f"POST {url}")
    resp = requests.post(
        url,
        json={"refreshToken": REFRESH_TOKEN},
        headers=headers,
        verify=False,
    )
    log("auth", f"HTTP {resp.status_code}")
    if resp.status_code in (401, 403):
        sys.exit(
            "Refresh token rejeitado. Abra o app no celular com o Proxyman "
            "ligado para capturar um token novo."
        )
    resp.raise_for_status()
    data = resp.json().get("data") or {}
    token = data.get("accessToken")
    if not token:
        raise ValueError(f"Token not found in refresh response: {resp.text[:300]}")
    # The API rotates refresh tokens: persist the new one or the next run fails.
    new_refresh = data.get("refreshToken")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        set_key(ENV_PATH, "REFRESH_TOKEN", new_refresh, quote_mode="never")
        log("auth", "new refresh token saved to .env")
    log("auth", "token refreshed OK")
    return token


def build_headers(token: str) -> dict:
    return {**STATIC_HEADERS, "Authorization": f"Bearer {token}"}


def get_json(session: requests.Session, url: str, headers: dict, params: dict):
    for attempt in range(1, RETRIES + 1):
        try:
            resp = session.get(
                url, params=params, headers=headers, verify=False, timeout=30
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            if attempt == RETRIES:
                raise
            time.sleep(attempt)


def fetch_all_list_items(session: requests.Session, headers: dict) -> list:
    all_items = []
    page = 1
    while True:
        data = get_json(
            session,
            f"{BASE_URL}/api/v2/cupom",
            headers,
            {"lat": LAT, "lng": LNG, "page": page},
        )
        items = data.get("list") or []
        log("list", f"page={page} → {len(items)} items")
        if not items:
            break
        # tipo "P" entries are sponsored banners mixed into the feed, not cupons
        all_items.extend(i for i in items if i.get("tipo") != "P")
        page += 1
    # Pages can overlap if the ordering shifts mid-crawl; keep the first copy.
    unique = list({item["id"]: item for item in reversed(all_items)}.values())[::-1]
    log("list", f"DONE — {len(unique)} unique items across {page - 1} pages")
    return unique


def fetch_cupom_detail(session: requests.Session, headers: dict, cupom_id: str) -> dict:
    return get_json(
        session, f"{BASE_URL}/api/v2/cupom/{cupom_id}", headers, {"flag": "true"}
    )


def update_config(session: requests.Session, headers: dict) -> None:
    """Refresh data/config.json (filter options). Non-fatal: keep the old one on error."""
    try:
        data = get_json(session, f"{BASE_URL}/api/v3/config", headers, {}).get("data") or {}
        config = {k: data[k] for k in ("caracteristica", "subCategoria", "regiao") if k in data}
        if not config.get("subCategoria"):
            raise ValueError("resposta sem subCategoria")
        save_json(CONFIG_PATH, config)
        log("config", f"saved config.json ({len(config['subCategoria'])} subcategorias)")
    except Exception as e:
        log("config", f"WARNING: config.json não atualizado: {e}")


def save_json(path: str, data) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def load_json(path: str, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_snapshot(stamp: str, cupoms: list) -> None:
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    path = os.path.join(SNAPSHOTS_DIR, f"{stamp}.json.gz")
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(cupoms, f, ensure_ascii=False)
    log("snapshot", f"saved {path}")


def previous_stamp() -> str:
    meta = load_json(META_PATH)
    if meta and meta.get("updatedAt"):
        return meta["updatedAt"]
    # first run with the new pipeline: date the existing data by its mtime
    mtime = os.path.getmtime(ALL_CUPOMS_PATH)
    return datetime.fromtimestamp(mtime, BRT).isoformat(timespec="minutes")


def stamp_to_filename(stamp: str) -> str:
    return stamp[:16].replace(":", "")


def record_changes(prev_stamp: str, new_stamp: str, result: dict) -> None:
    entry_id = stamp_to_filename(new_stamp)
    changelog = {"id": entry_id, "from": prev_stamp, "to": new_stamp, **result}
    save_json(os.path.join(CHANGES_DIR, f"{entry_id}.json"), changelog)

    index = [e for e in load_json(CHANGES_INDEX_PATH, []) if e["id"] != entry_id]
    index.insert(
        0,
        {
            "id": entry_id,
            "from": prev_stamp,
            "to": new_stamp,
            "added": len(result["added"]),
            "removed": len(result["removed"]),
            "changed": len(result["changed"]),
        },
    )
    save_json(CHANGES_INDEX_PATH, index)


def main(resume: bool = False, allow_shrink: bool = False):
    os.makedirs(DATA_DIR, exist_ok=True)
    t0 = time.time()

    prev_cupoms = load_json(ALL_CUPOMS_PATH)

    token = refresh_token()
    headers = build_headers(token)
    session = requests.Session()

    if resume and os.path.exists(LIST_RAW_PATH):
        list_items = load_json(LIST_RAW_PATH)
        log("list", f"--resume: using cached list_raw.json ({len(list_items)} items)")
    else:
        list_items = fetch_all_list_items(session, headers)

    if not list_items:
        sys.exit("A API retornou a lista vazia — nada foi gravado.")
    if prev_cupoms and not allow_shrink and len(list_items) < 0.6 * len(prev_cupoms):
        sys.exit(
            f"A lista caiu de {len(prev_cupoms)} para {len(list_items)} cupons — "
            "parece erro da API, nada foi gravado. Use --allow-shrink se for real."
        )

    ids = [item["id"] for item in list_items]
    details = {}
    errors = []

    log("detail", f"starting — {len(ids)} cupons, {MAX_WORKERS} workers")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_cupom_detail, session, headers, cid): cid for cid in ids}
        for done, fut in enumerate(as_completed(futures), 1):
            cid = futures[fut]
            try:
                detail = fut.result()
                if not detail.get("id"):
                    raise ValueError(f"detalhe vazio: {json.dumps(detail)[:200]}")
                details[cid] = detail
                if done % 25 == 0 or done == len(ids):
                    log("detail", f"{done}/{len(ids)}")
            except Exception as e:
                errors.append(cid)
                log("detail", f"ERROR id={cid}: {e}")

    if errors:
        save_json(LIST_RAW_PATH, list_items)
        sys.exit(
            f"{len(errors)} detalhes falharam ({errors}) — nada foi gravado para "
            "não registrar remoções falsas. Rode de novo com --resume."
        )

    # keep the list's ordering
    new_cupoms = [details[cid] for cid in ids]
    new_stamp = datetime.now(BRT).isoformat(timespec="minutes")

    updated_at = new_stamp
    if prev_cupoms:
        prev_stamp = previous_stamp()
        result = diff_cupoms(prev_cupoms, new_cupoms)
        print_report(result)
        if any(result.values()):
            if not os.path.isdir(SNAPSHOTS_DIR) or not os.listdir(SNAPSHOTS_DIR):
                save_snapshot(stamp_to_filename(prev_stamp), prev_cupoms)
            record_changes(prev_stamp, new_stamp, result)
            save_snapshot(stamp_to_filename(new_stamp), new_cupoms)
        else:
            # nothing changed: keep the last changelog as "latest" in the app
            updated_at = prev_stamp
    else:
        save_snapshot(stamp_to_filename(new_stamp), new_cupoms)

    update_config(session, headers)
    save_json(LIST_RAW_PATH, list_items)
    save_json(ALL_CUPOMS_PATH, new_cupoms)
    save_json(
        META_PATH,
        {"updatedAt": updated_at, "checkedAt": new_stamp, "count": len(new_cupoms)},
    )

    log("done", f"{len(new_cupoms)} cupons saved in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    parser = argparse.ArgumentParser(description="Atualiza os cupons e registra o que mudou")
    parser.add_argument(
        "--resume",
        action="store_true",
        help="reaproveita o list_raw.json da última execução (após falha nos detalhes)",
    )
    parser.add_argument(
        "--allow-shrink",
        action="store_true",
        help="aceita uma queda grande no número de cupons",
    )
    args = parser.parse_args()
    main(resume=args.resume, allow_shrink=args.allow_shrink)
