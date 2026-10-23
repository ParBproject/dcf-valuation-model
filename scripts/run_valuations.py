"""Offline: value every ticker from the latest snapshot -> results/base_valuations.json"""

import json
from pathlib import Path

from dcf.model.valuation import run

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    snap = sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]
    res = run(snap, ROOT / "config")
    (ROOT / "results" / "base_valuations.json").write_text(json.dumps(res, indent=2) + "\n")
    print(
        f"{'tkr':5} {'implied':>9} {'exit-mult':>9} {'market':>8} {'WACC':>6} {'g':>5} {'TV%':>5}"
    )
    for t, v in res["valuations"].items():
        print(
            f"{t:5} {v['implied_price']:9.2f} {v['implied_price_exit_multiple']:9.2f} "
            f"{v['market_price']:8.2f} {v['wacc']:6.2%} "
            f"{v['assumptions']['terminal_growth']:5.1%} {v['tv_share_of_ev']:5.0%}"
        )
