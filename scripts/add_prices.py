"""Add prices.json (5y monthly closes) to the latest snapshot and record it in the manifest."""

import json
from pathlib import Path

from dcf.data.prices import fetch_monthly

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    snap = sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]
    man = json.loads((snap / "manifest.json").read_text())
    p = fetch_monthly(man["tickers"])
    (snap / "prices.json").write_text(json.dumps(p, indent=1) + "\n")
    man["files"]["prices.json"] = {"source": p["source"], "fetched_at": p["fetched_at"]}
    (snap / "manifest.json").write_text(json.dumps(man, indent=2) + "\n")
    print(snap / "prices.json", len(p["dates"]), p["dates"][0], p["dates"][-1])
