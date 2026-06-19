import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

# ── config ──────────────────────────────────────────────────────────────────
def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Missing required environment variable: {name}")
    return value


REFRESH_TOKEN = _require_env("REFRESH_TOKEN")
X_TOKEN = _require_env("X_TOKEN")
DEVICE_ID = os.environ.get("DEVICE_ID", "2732D26F-F83F-4017-B9BE-18358029012C")
LAT = os.environ.get("LAT", "-30.052255086611673")
LNG = os.environ.get("LNG", "-51.221907636001546")
BASE_URL = os.environ.get("BASE_URL", "https://api.brasilemdobro.com.br")
DATA_DIR = os.environ.get("DATA_DIR", "data")
MAX_WORKERS = int(os.environ.get("MAX_WORKERS", "10"))
CUPOM_DIR = os.path.join(DATA_DIR, "cupoms")

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
    resp.raise_for_status()
    data = resp.json()
    token = data.get("data").get("accessToken")
    if not token:
        raise ValueError(f"Token not found in refresh response: {data}")
    log("auth", "token refreshed OK")
    return token


def build_headers(token: str) -> dict:
    return {**STATIC_HEADERS, "Authorization": f"Bearer {token}"}


def fetch_list_page(session: requests.Session, headers: dict, page: int) -> list:
    url = f"{BASE_URL}/api/v2/cupom"
    log("list", f"GET page={page}")
    resp = session.get(
        url,
        params={"lat": LAT, "lng": LNG, "page": page},
        headers=headers,
        verify=False,
    )
    log("list", f"HTTP {resp.status_code} page={page}")
    resp.raise_for_status()
    items = resp.json().get("list") or []
    log("list", f"page={page} → {len(items)} items")
    return items


def fetch_all_list_items(session: requests.Session, headers: dict) -> list:
    all_items = []
    page = 1
    while True:
        items = fetch_list_page(session, headers, page)
        if not items:
            log("list", f"page={page} empty — stopping")
            break
        all_items.extend(items)
        page += 1
    log("list", f"DONE — {len(all_items)} items across {page - 1} pages")
    return all_items


def fetch_cupom_detail(session: requests.Session, headers: dict, cupom_id: str) -> dict:
    url = f"{BASE_URL}/api/v2/cupom/{cupom_id}"
    resp = session.get(
        url,
        params={"flag": "true"},
        headers=headers,
        verify=False,
    )
    resp.raise_for_status()
    return resp.json()


def save_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    os.makedirs(CUPOM_DIR, exist_ok=True)
    t0 = time.time()

    token = refresh_token()
    headers = build_headers(token)
    session = requests.Session()

    list_raw_path = os.path.join(DATA_DIR, "list_raw.json")
    if os.path.exists(list_raw_path):
        with open(list_raw_path, encoding="utf-8") as f:
            list_items = json.load(f)
        log("list", f"loaded list_raw.json ({len(list_items)} items, cached)")
    else:
        list_items = fetch_all_list_items(session, headers)
        save_json(list_raw_path, list_items)
        log("list", f"saved list_raw.json ({len(list_items)} items)")

    ids = [item["id"] for item in list_items]
    details = {}
    errors = []

    def fetch_and_save(cupom_id):
        path = os.path.join(CUPOM_DIR, f"{cupom_id}.json")
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                return cupom_id, json.load(f), "cached"
        detail = fetch_cupom_detail(session, headers, cupom_id)
        save_json(path, detail)
        return cupom_id, detail, "fetched"

    log("detail", f"starting — {len(ids)} cupons, {MAX_WORKERS} workers")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_and_save, cid): cid for cid in ids}
        done = cached = fetched = 0
        for fut in as_completed(futures):
            cid = futures[fut]
            try:
                cupom_id, detail, source = fut.result()
                details[cupom_id] = detail
                done += 1
                if source == "cached":
                    cached += 1
                else:
                    fetched += 1
                log("detail", f"{done}/{len(ids)} id={cupom_id} [{source}]")
            except Exception as e:
                errors.append(cid)
                log("detail", f"ERROR id={cid}: {e}")

    all_cupoms = list(details.values())
    save_json(os.path.join(DATA_DIR, "all_cupoms.json"), all_cupoms)

    elapsed = time.time() - t0
    log(
        "done",
        f"{len(all_cupoms)} cupons saved in {elapsed:.1f}s "
        f"(fetched={fetched}, cached={cached}, errors={len(errors)})",
    )
    if errors:
        log("done", f"failed ids: {errors}")


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    main()
