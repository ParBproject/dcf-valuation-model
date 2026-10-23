"""Export parity fixtures for the TypeScript engine (web/src/engine).

Reference values come from the Python model itself. Rate inputs (rf, ERP, beta) rebuild
the WACC with the same functions build_params uses; a scenario's WACC shift is added on top.
Output: web/src/engine/__fixtures__/parity.json (generated, do not edit).
"""

import json
from pathlib import Path

import yaml

from dcf.analysis import montecarlo, results, reverse_dcf
from dcf.model import valuation, wacc

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "src" / "engine" / "__fixtures__" / "parity.json"
RATE_KEYS = {"rf", "erp", "beta", "wacc_shift"}


def reference(p: dict, over: dict) -> dict:
    rate = {k: v for k, v in over.items() if k in RATE_KEYS}
    model = {k: v for k, v in over.items() if k not in RATE_KEYS}
    rf = rate.get("rf", p["rf"])
    ke = wacc.cost_of_equity(rf, rate.get("beta", p["beta"]), rate.get("erp", p["erp"]))
    kd, _ = wacc.pretax_cost_of_debt(p["interest_expense"], p["debt"], rf, p["debt_spread"])
    w = wacc.wacc(p["market_cap"], p["debt"], ke, kd, p["tax_rate"]) + rate.get("wacc_shift", 0)
    if "wacc" in model:  # direct WACC override (heatmap click) replaces the computed value
        w = model.pop("wacc")
    d = valuation.price({**p, "rf": rf}, detail=True, wacc=w, **model)
    return {
        "wacc": w,
        "implied_price": d["implied_price"],
        "implied_price_exit_multiple": d["implied_price_exit_multiple"],
        "enterprise_value": d["enterprise_value"],
        "terminal_value": d["terminal_value"],
        "tv_share_of_ev": d["tv_share_of_ev"],
    }


PERTURBED = [
    {"growth_start": 0.02, "capex_to_rev": -0.01},  # deltas (applied to base below)
    {"rf": 0.0418},  # Damodaran matched pairing
    {"beta": 1.3, "erp": 0.05},
    {"forecast_years": 5, "terminal_roic": 0.20},
    {"target_margin": -0.03, "terminal_growth": -0.005},
    {"wacc": 0.08, "terminal_growth": 0.005},  # direct WACC override; g is a delta
    {"tax_rate": 0.25},  # tornado tax shock (projection only, WACC unchanged)
]
DELTA_KEYS = {"growth_start", "capex_to_rev", "target_margin", "terminal_growth"}


if __name__ == "__main__":
    snap = sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]
    _, ps = valuation.all_params(snap, ROOT / "config")
    shifts = yaml.safe_load((ROOT / "config" / "scenarios.yaml").read_text())
    out = {"snapshot_date": snap.name, "tickers": {}}
    for t, p in ps.items():
        cases = [{"name": "base", "overrides": {}}]
        for name in ("bear", "bull"):
            sc = results.scenarios(p, {name: shifts[name]})[name]
            ov = {
                k: sc["assumptions"][k]
                for k in (
                    "growth_start",
                    "terminal_growth",
                    "target_margin",
                    "capex_to_rev",
                    "forecast_years",
                    "terminal_roic",
                )
            }
            ov["wacc_shift"] = sc["wacc"] - p["wacc"]
            cases.append({"name": name, "overrides": ov})
        for i, pert in enumerate(PERTURBED):
            ov = {k: (p[k] + v if k in DELTA_KEYS else v) for k, v in pert.items()}
            cases.append({"name": f"perturbed_{i}", "overrides": ov})
        for c in cases:
            c["expected"] = reference(p, c["overrides"])
        rv = reverse_dcf.implied_growth(p)
        out["tickers"][t] = {
            "params": results.engine_params(p),
            "cases": cases,
            "reverse_dcf": {
                "implied_growth": rv["implied_growth"],
                "implied_growth_margin_held": rv["implied_growth_margin_held"],
            },
            "monte_carlo": montecarlo.summary(p),
        }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1) + "\n")
    print(OUT)
