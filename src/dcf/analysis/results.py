"""Build results/valuations.json, the single versioned file the web app reads."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

from ..model import valuation
from . import montecarlo, reverse_dcf, sensitivity

SCHEMA_VERSION = "1.3.0"


def _overrides(p: dict, spec: dict) -> dict:
    """spec = {"shift": {k: delta}, "set": {k: value | "last_margin"}}."""
    over = {k: p[k] + v for k, v in (spec.get("shift") or {}).items()}
    for k, v in (spec.get("set") or {}).items():
        over[k] = p["base_margin"] if v == "last_margin" else v
    return over


def scenarios(p: dict, shifts: dict) -> dict:
    out = {}
    for name, sh in shifts.items():
        sh = sh or {}
        over = _overrides(p, sh)
        d = valuation.price(p, detail=True, **over)
        out[name] = {
            "shifts": sh.get("shift", {}),
            "sets": sh.get("set", {}),
            "assumptions": {k: over.get(k, p[k]) for k in valuation.ASSUMPTION_KEYS},
            "implied_price": d["implied_price"],
            "upside": d["implied_price"] / p["market_price"] - 1,
            "wacc": over.get("wacc", p["wacc"]),
            "terminal_growth": over.get("terminal_growth", p["terminal_growth"]),
            "tv_share_of_ev": d["tv_share_of_ev"],
        }
    return out


ENGINE_KEYS = [
    "base_fiscal_year",
    "base_revenue",
    "base_margin",
    "tax_rate",
    "rf",
    "erp",
    "beta",
    "beta_method",
    "betas",
    "interest_expense",
    "debt_spread",
    "debt",
    "gross_debt",
    "finance_receivables_netted",
    "cash",
    "market_cap",
    "shares",
    "market_price",
    "wacc",
    "growth_start",
    "terminal_growth",
    "target_margin",
    "capex_to_rev",
    "da_to_rev",
    "nwc_to_rev",
    "exit_ev_ebitda",
    "forecast_years",
    "terminal_roic",
]


def engine_params(p: dict) -> dict:
    """Flat inputs for the TypeScript engine (web/src/engine), schema >= 1.2.0."""
    return {k: p[k] for k in ENGINE_KEYS}


HISTORY_FIELDS = [
    "revenue",
    "operating_income",
    "pretax_income",
    "tax_expense",
    "d_and_a",
    "capex",
    "interest_expense",
    "current_assets",
    "current_liabilities",
    "cash",
    "short_term_investments",
    "debt_noncurrent",
    "debt_current",
    "short_term_borrowings",
    "total_debt",
    "finance_receivables_current",
    "finance_receivables_noncurrent",
    "diluted_shares",
]


def history(record: dict, p: dict) -> dict:
    """Snapshot line items per fiscal year with their SEC provenance, plus model FCFF.
    Used by the web drill-downs (schema >= 1.3.0)."""
    years = []
    for y in record["years"]:
        years.append(
            {
                "fiscal_year": y["fiscal_year"],
                "period_end": y["period_end"],
                "values": {k: y.get(k) for k in HISTORY_FIELDS},
                "sources": {k: v for k, v in y["sources"].items() if k in HISTORY_FIELDS},
                "fcff": p["historical_fcff"].get(y["fiscal_year"]),
            }
        )
    return {"cik": record.get("cik"), "entity_name": record.get("entity_name"), "years": years}


def build(snapshot_dir: Path, config_dir: Path, n_draws: int = montecarlo.N_DRAWS) -> dict:
    snap, ps = valuation.all_params(snapshot_dir, config_dir)
    records = snap["records"]
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
            "engine": engine_params(p),
            "history": history(records[t], p),
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
