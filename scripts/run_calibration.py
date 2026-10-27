"""Write results/calibration.json (gap decomposition and sensitivities) and print it."""

import json
from pathlib import Path

from dcf.analysis.calibration import decompose

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    snap = sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]
    res = {"snapshot_date": snap.name, "tickers": decompose(snap, ROOT / "config")}
    (ROOT / "results" / "calibration.json").write_text(json.dumps(res, indent=1) + "\n")
    for t, v in res["tickers"].items():
        print(
            t,
            "market",
            v["market_price"],
            "wacc",
            round(v["wacc"], 4),
            "m3wacc",
            round(v["wacc_m3"], 4),
        )
        for s in v["steps"]:
            d = "" if s["delta"] is None else f"{s['delta']:+.2f}"
            print(f"   {s['step']:8} {s['price']:8.2f} {d}")
        for k, x in v["sensitivities"].items():
            print(f"   {k:24} {x:8.2f}")
        print("   implied g", v["implied_growth"], "margin held", v["implied_growth_margin_held"])
