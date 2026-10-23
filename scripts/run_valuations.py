"""Offline: value every ticker from the latest snapshot.

Writes results/base_valuations.json (base case) and results/valuations.json (versioned,
read by the web app).
"""

import json
from pathlib import Path

from dcf.analysis.results import build, write
from dcf.model.valuation import run

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    snap = sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]
    base = run(snap, ROOT / "config")
    (ROOT / "results" / "base_valuations.json").write_text(json.dumps(base, indent=2) + "\n")
    res = build(snap, ROOT / "config")
    write(res, ROOT / "results" / "valuations.json")
    hdr = [
        "tkr",
        "implied",
        "market",
        "WACC",
        "beta",
        "g",
        "TV%",
        "P5",
        "P50",
        "P95",
        "P>px",
        "impl_g",
    ]
    print(" ".join(f"{h:>8}" for h in hdr))
    for t, v in res["tickers"].items():
        b, mc, rv = v["base"], v["monte_carlo"], v["reverse_dcf"]
        pc = mc["percentiles"]
        ig = rv["implied_growth"]
        print(
            f"{t:>8} {b['implied_price']:8.2f} {b['market_price']:8.2f} {b['wacc']:8.2%} "
            f"{b['inputs']['beta']:8.2f} {b['assumptions']['terminal_growth']:8.1%} "
            f"{b['tv_share_of_ev']:8.0%} {pc['p5']:8.2f} {pc['p50']:8.2f} {pc['p95']:8.2f} "
            f"{mc['prob_value_gt_price']:8.1%} {'n/a' if ig is None else f'{ig:.1%}':>8}"
        )
