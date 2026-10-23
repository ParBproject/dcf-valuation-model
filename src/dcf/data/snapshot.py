"""Fetch all inputs and write a dated snapshot: python -m dcf.data.snapshot"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path

from . import edgar, market, prices, rates, sources

ROOT = Path(__file__).resolve().parents[3]


def _dump(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, indent=2, sort_keys=False) + "\n")


def build(out_root: Path, snap_date: str) -> Path:
    out = out_root / snap_date
    out.mkdir(parents=True, exist_ok=True)
    now = lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")  # noqa: E731
    files: dict[str, dict] = {}
    cov = []
    for tkr, cik in sources.TICKERS.items():
        rec = edgar.extract(edgar.fetch_companyfacts(cik), tkr)
        rec["fetched_at"] = now()
        rec["source"] = sources.SEC_COMPANYFACTS_URL.format(cik=cik)
        _dump(out / f"{tkr}.json", rec)
        files[f"{tkr}.json"] = {"source": rec["source"], "fetched_at": rec["fetched_at"]}
        cov.append(edgar.coverage(rec))
    mkt = {t: market.fetch_market(t) for t in sources.TICKERS}
    _dump(out / "market.json", mkt)
    files["market.json"] = {"source": "yfinance", "fetched_at": now()}
    px = prices.fetch_monthly(list(sources.TICKERS))
    _dump(out / "prices.json", px)
    files["prices.json"] = {"source": px["source"], "fetched_at": px["fetched_at"]}
    r = rates.fetch_dgs10()
    r["fetched_at"] = now()
    r["equity_risk_premium"] = {
        "value": sources.DAMODARAN_ERP,
        "as_of": sources.DAMODARAN_ERP_AS_OF,
        "source": sources.DAMODARAN_ERP_SOURCE,
    }
    _dump(out / "rates.json", r)
    files["rates.json"] = {"source": r["source"], "fetched_at": r["fetched_at"]}
    _dump(
        out / "manifest.json",
        {
            "snapshot_date": snap_date,
            "tickers": list(sources.TICKERS),
            "files": files,
            "coverage": cov,
        },
    )
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--date", default=date.today().isoformat())
    p.add_argument("--out", type=Path, default=ROOT / "data" / "snapshots")
    a = p.parse_args()
    print(build(a.out, a.date))


if __name__ == "__main__":
    main()
