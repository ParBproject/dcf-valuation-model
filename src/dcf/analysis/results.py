"""Build results/valuations.json, the single versioned file the web app reads."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

from ..model import valuation
from . import montecarlo, reverse_dcf, sensitivity

SCHEMA_VERSION = "1.0.0"


def scenarios(p: dict, shifts: dict) -> dict:
    out = {}
    for name, sh in shifts.items():
        over = {k: p[k] + v for k, v in (sh or {}).items()}
        d = valuation.price(p, detail=True, **over)
        out[name] = {
            "shifts": sh or {},
            "implied_price": d["implied_price"],
            "upside": d["implied_price"] / p["market_price"] - 1,
            "wacc": over.get("wacc", p["wacc"]),
            "terminal_growth": over.get("terminal_growth", p["terminal_growth"]),
            "tv_share_of_ev": d["tv_share_of_ev"],
        }
    return out


def build(snapshot_dir: Path, config_dir: Path, n_draws: int = montecarlo.N_DRAWS) -> dict:
    snap, ps = valuation.all_params(snapshot_dir, config_dir)
    shifts = yaml.safe_load((config_dir / "scenarios.yaml").read_text())
    tickers = {}
    for t, p in ps.items():
        tickers[t] = {
            "base": valuation.summarize(p, valuation.price(p, detail=True)),
            "scenarios": scenarios(p, shifts),
            "sensitivity": sensitivity.grid(p),
            "tornado": sensitivity.tornado(p),
            "monte_carlo": montecarlo.summary(p, n=n_draws),
            "reverse_dcf": reverse_dcf.implied_growth(p),
        }
    return {
        "schema_version": SCHEMA_VERSION,
        "snapshot_date": snap["manifest"]["snapshot_date"],
        "rates": {
            "rf": snap["rates"]["yield"],
            "rf_date": snap["rates"]["observation_date"],
            "erp": snap["rates"]["equity_risk_premium"],
        },
        "tickers": tickers,
    }


def write(res: dict, path: Path) -> None:
    path.write_text(json.dumps(res, indent=1, default=float) + "\n")
