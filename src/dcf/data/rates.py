"""10-year US Treasury yield (FRED DGS10) via the public fredgraph CSV (no API key)."""

from __future__ import annotations

import csv
import io

from . import http
from .sources import FRED_CSV_URL


def parse_fred_csv(text: str) -> list[tuple[str, float]]:
    rows = list(csv.reader(io.StringIO(text)))
    out: list[tuple[str, float]] = []
    for r in rows[1:]:
        if len(r) < 2 or r[1] in ("", "."):
            continue
        out.append((r[0], float(r[1])))
    return out


def fetch_dgs10() -> dict:
    url = FRED_CSV_URL.format(series="DGS10")
    obs = parse_fred_csv(http.get(url, limiter=None).text)
    if not obs:
        raise ValueError("no DGS10 observations parsed")
    d, v = obs[-1]
    return {
        "series": "DGS10",
        "observation_date": d,
        "yield_pct": v,
        "yield": round(v / 100.0, 6),
        "source": url,
    }
