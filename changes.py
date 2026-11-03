"""Compare two versions of all_cupoms.json and describe what changed.

Only fields a person would care about are compared; volatile ones the API
recomputes on every request (today, aberto, distancia, favorito, notWorking…)
are ignored so they never show up as fake changes.

Usage: python changes.py OLD.json[.gz] NEW.json[.gz]
"""

import difflib
import gzip
import json
import re
import sys

DAY_NAMES = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
API_TZ_OFFSET_MIN = -3 * 60  # API horarios are GMT; the app shows UTC-3

TEXT_FIELDS = [
    ("nome", "Nome"),
    ("descricao", "Prato"),
    ("beneficio", "Benefício"),
    ("regra", "Regra"),
    ("validade", "Validade"),
    ("telefone", "Telefone"),
    ("instagram", "Instagram"),
]


def _text(value) -> str:
    if value is None:
        return ""
    return re.sub(r"[ \t]+", " ", str(value).replace("\r\n", "\n")).strip()


# "(ver regras)" gets appended/removed from dish names without meaning anything
VER_REGRAS = re.compile(r"\(\s*ver regras?\s*\)", re.IGNORECASE)


def _words(s: str) -> list:
    return re.findall(r"\w+", VER_REGRAS.sub(" ", s).casefold())


def _same_text(a: str, b: str) -> bool:
    """Equal ignoring case, punctuation, spacing and "(ver regras)"."""
    return _words(a) == _words(b)


def _echoes(change: dict, source: dict) -> bool:
    """True if every word edit in `change` also appears in `source` — e.g. the
    rule text repeating the dish swap ("segundo prato individual" →
    "segundo item individual" when the dish went "prato" → "item")."""
    before, after = _words(change["before"]), _words(change["after"])
    src_before, src_after = " ".join(_words(source["before"])), " ".join(_words(source["after"]))
    ops = difflib.SequenceMatcher(None, before, after, autojunk=False).get_opcodes()
    return all(
        " ".join(before[i1:i2]) in src_before and " ".join(after[j1:j2]) in src_after
        for tag, i1, i2, j1, j2 in ops
        if tag != "equal"
    )


def _subcats(c) -> list:
    raw = c.get("sub_categoria") or ""
    return sorted({s.strip() for s in raw.split(",") if s.strip()})


def _caracts(c) -> list:
    out = set()
    for ch in c.get("caracteristica") or []:
        out.add(ch.get("nome") if isinstance(ch, dict) else str(ch))
    return sorted(out)


def _local_minutes(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return (h * 60 + m + API_TZ_OFFSET_MIN) % (24 * 60)


def _fmt(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _day_schedule(end: dict, day: int) -> str:
    """Opening hours for one day, in local time, with the lunch (A) and dinner
    (J) periods merged when contiguous — the API often re-splits the same hours
    differently (e.g. 10:00-14:00 + 14:01-18:00 vs 10:00-18:00)."""
    horario = end.get("horario") or {}
    ranges, unparsed = [], []
    for period in ("A", "J"):
        raw = ((horario.get(period) or {}).get(str(day)) or {}).get("horario")
        if not raw or raw == "-":
            continue
        try:
            start, stop = (_local_minutes(p) for p in raw.split(" - "))
            ranges.append([start, stop])
        except ValueError:
            unparsed.append(raw)
    ranges.sort()
    merged = []
    for start, stop in ranges:
        if merged and merged[-1][1] >= merged[-1][0] and start <= merged[-1][1] + 1:
            merged[-1][1] = max(merged[-1][1], stop) if stop >= start else stop
        else:
            merged.append([start, stop])
    parts = [f"{_fmt(a)} - {_fmt(b)}" for a, b in merged] + unparsed
    return ", ".join(parts) if parts else "Fechado"


def _unit_label(end: dict) -> str:
    return end.get("bairro") or end.get("lugar_nome") or "Unidade"


def _unit_key(end: dict, idx: int):
    return end.get("lugar_codigo") or f"#{idx}"


def _units(c) -> dict:
    return {_unit_key(e, i): e for i, e in enumerate(c.get("endereco") or [])}


def _bairros(c) -> list:
    seen = []
    for e in c.get("endereco") or []:
        b = e.get("bairro")
        if b and b not in seen:
            seen.append(b)
    return seen


def _summary(c) -> dict:
    return {
        "id": c["id"],
        "nome": c.get("nome"),
        "logo": c.get("logo"),
        "image": c.get("image"),
        "descricao": c.get("descricao"),
        "beneficio": c.get("beneficio"),
        "bairros": _bairros(c),
    }


def _unit_changes(old: dict, new: dict) -> list:
    changes = []
    old_units, new_units = _units(old), _units(new)
    for key, end in new_units.items():
        if key not in old_units:
            changes.append(
                {
                    "field": "unidade",
                    "label": "Unidade nova",
                    "before": None,
                    "after": f"{_unit_label(end)} — {_text(end.get('endereco'))}",
                }
            )
    for key, end in old_units.items():
        if key not in new_units:
            changes.append(
                {
                    "field": "unidade",
                    "label": "Unidade fechou",
                    "before": f"{_unit_label(end)} — {_text(end.get('endereco'))}",
                    "after": None,
                }
            )
    for key, new_end in new_units.items():
        old_end = old_units.get(key)
        if old_end is None:
            continue
        label = _unit_label(new_end)
        if not _same_text(_text(old_end.get("endereco")), _text(new_end.get("endereco"))):
            changes.append(
                {
                    "field": "endereco",
                    "label": f"Endereço · {label}",
                    "before": _text(old_end.get("endereco")),
                    "after": _text(new_end.get("endereco")),
                }
            )
        before, after = [], []
        for day in range(1, 8):
            b, a = _day_schedule(old_end, day), _day_schedule(new_end, day)
            if b != a:
                before.append(f"{DAY_NAMES[day]}: {b}")
                after.append(f"{DAY_NAMES[day]}: {a}")
        if before:
            changes.append(
                {
                    "field": "horario",
                    "label": f"Horário · {label}",
                    "before": "\n".join(before),
                    "after": "\n".join(after),
                }
            )
    return changes


def cupom_changes(old: dict, new: dict) -> list:
    changes = []
    for field, label in TEXT_FIELDS:
        b, a = _text(old.get(field)), _text(new.get(field))
        if not _same_text(b, a):
            changes.append({"field": field, "label": label, "before": b, "after": a})

    # the rule usually spells out the dish; skip it when that is all it changed
    by_field = {ch["field"]: ch for ch in changes}
    if "descricao" in by_field and "regra" in by_field and _echoes(by_field["regra"], by_field["descricao"]):
        changes.remove(by_field["regra"])

    for field, label, getter in (
        ("sub_categoria", "Categorias", _subcats),
        ("caracteristica", "Características", _caracts),
    ):
        b, a = getter(old), getter(new)
        if b != a:
            changes.append(
                {"field": field, "label": label, "before": ", ".join(b), "after": ", ".join(a)}
            )

    if (old.get("image") or "") != (new.get("image") or ""):
        changes.append(
            {"field": "image", "label": "Foto", "before": old.get("image"), "after": new.get("image")}
        )

    return changes + _unit_changes(old, new)


def diff_cupoms(prev: list, new: list) -> dict:
    prev_by_id = {c["id"]: c for c in prev}
    new_by_id = {c["id"]: c for c in new}

    added = [_summary(c) for c in new if c["id"] not in prev_by_id]
    removed = [_summary(c) for c in prev if c["id"] not in new_by_id]
    changed = []
    for c in new:
        old = prev_by_id.get(c["id"])
        if old is None:
            continue
        diffs = cupom_changes(old, c)
        if diffs:
            changed.append(
                {"id": c["id"], "nome": c.get("nome"), "logo": c.get("logo"), "changes": diffs}
            )

    by_name = lambda x: (x.get("nome") or "").casefold()
    return {
        "added": sorted(added, key=by_name),
        "removed": sorted(removed, key=by_name),
        "changed": sorted(changed, key=by_name),
    }


def summary_line(result: dict) -> str:
    return (
        f"+{len(result['added'])} entraram, "
        f"−{len(result['removed'])} saíram, "
        f"{len(result['changed'])} mudaram"
    )


def print_report(result: dict) -> None:
    print(summary_line(result))
    for title, key in (("Entraram", "added"), ("Saíram", "removed")):
        if result[key]:
            print(f"\n{title}:")
            for c in result[key]:
                print(f"  • {c['nome']} — {c.get('descricao') or ''}")
    if result["changed"]:
        print("\nMudaram:")
        for c in result["changed"]:
            print(f"  • {c['nome']}: {', '.join(ch['label'] for ch in c['changes'])}")


def _load(path: str) -> list:
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    print_report(diff_cupoms(_load(sys.argv[1]), _load(sys.argv[2])))
