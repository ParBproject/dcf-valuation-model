"""End-to-end valuation from a snapshot + per-ticker YAML config."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

from . import fcf, forecast, terminal, wacc


def discount_factors(rate: float, n: int) -> list[float]:
    return [1 / (1 + rate) ** t for t in range(1, n + 1)]


def enterprise_value(fcfs: list[float], tv: float, rate: float) -> tuple[float, float, float]:
    df = discount_factors(rate, len(fcfs))
    pv_fcf = sum(f * d for f, d in zip(fcfs, df, strict=True))
    pv_tv = tv * df[-1]
    return pv_fcf + pv_tv, pv_fcf, pv_tv


def equity_bridge(ev: float, debt: float, cash: float, shares: float) -> tuple[float, float]:
    eq = ev - debt + cash
    return eq, eq / shares


def load_config(path: Path) -> dict:
    return yaml.safe_load(path.read_text())


def value_ticker(record: dict, mkt: dict, rates: dict, cfg: dict) -> dict:
    rows = fcf.history(record)
    drv = fcf.drivers(rows)
    last = record["years"][-1]
    rf = rates["yield"]
    erp = rates["equity_risk_premium"]["value"]

    tax = cfg.get("tax_rate", drv["tax_rate"])
    debt = last["total_debt"]
    if cfg.get("exclude_short_term_borrowings"):
        debt -= last.get("short_term_borrowings") or 0.0
    beta = cfg.get("beta", mkt["beta"])
    ke = wacc.cost_of_equity(rf, beta, erp)
    interest = None if cfg.get("ignore_interest") else last.get("interest_expense")
    kd, kd_method = wacc.pretax_cost_of_debt(interest, debt, rf, cfg.get("debt_spread", 0.01))
    mcap = mkt["price"] * mkt["shares_outstanding"]
    r = wacc.wacc(mcap, debt, ke, kd, tax)

    g = cfg["terminal_growth"]
    growth_start = cfg.get("growth_start", drv["revenue_cagr"])
    growth_start = min(
        max(growth_start, cfg.get("growth_floor", -0.05)), cfg.get("growth_cap", 0.15)
    )
    target_margin = cfg.get("target_margin", drv["ebit_margin_mean"])
    capex_to_rev = cfg.get("capex_to_rev", drv["capex_to_rev"])
    da_to_rev = cfg.get("da_to_rev", drv["da_to_rev"])
    nwc_to_rev = cfg.get("nwc_to_rev", drv["nwc_to_rev"])
    proj = forecast.project(
        last["fiscal_year"],
        last["revenue"],
        drv["ebit_margin_last"],
        growth_start=growth_start,
        terminal_growth=g,
        target_margin=target_margin,
        capex_to_rev=capex_to_rev,
        da_to_rev=da_to_rev,
        nwc_to_rev=nwc_to_rev,
        tax_rate=tax,
        years=cfg.get("forecast_years", 5),
    )
    tv = terminal.gordon(proj[-1].fcff, r, g)
    ev, pv_fcf, pv_tv = enterprise_value([p.fcff for p in proj], tv, r)
    shares = mkt["shares_outstanding"]
    eq, per_share = equity_bridge(ev, debt, last["cash"], shares)
    ebitda_n = proj[-1].ebit + proj[-1].d_and_a
    tv_exit = terminal.exit_multiple(ebitda_n, cfg["exit_ev_ebitda"])
    ev_exit, _, _ = enterprise_value([p.fcff for p in proj], tv_exit, r)
    _, per_share_exit = equity_bridge(ev_exit, debt, last["cash"], shares)
    return {
        "ticker": record["ticker"],
        "base_fiscal_year": last["fiscal_year"],
        "inputs": {
            "rf": rf,
            "erp": erp,
            "beta": beta,
            "cost_of_equity": ke,
            "pretax_cost_of_debt": kd,
            "cost_of_debt_method": kd_method,
            "tax_rate": tax,
            "debt": debt,
            "cash": last["cash"],
            "market_cap": mcap,
            "shares": shares,
        },
        "drivers": drv,
        "assumptions": {
            "growth_start": growth_start,
            "terminal_growth": g,
            "target_margin": target_margin,
            "capex_to_rev": capex_to_rev,
            "da_to_rev": da_to_rev,
            "nwc_to_rev": nwc_to_rev,
            "exit_ev_ebitda": cfg["exit_ev_ebitda"],
        },
        "historical_fcff": {r_.fiscal_year: r_.fcff for r_ in rows},
        "forecast": [p.__dict__ for p in proj],
        "wacc": r,
        "terminal_value": tv,
        "tv_implied_ev_ebitda": terminal.implied_multiple(tv, ebitda_n),
        "enterprise_value": ev,
        "pv_fcf": pv_fcf,
        "pv_tv": pv_tv,
        "tv_share_of_ev": pv_tv / ev if ev else None,
        "equity_value": eq,
        "implied_price": per_share,
        "implied_price_exit_multiple": per_share_exit,
        "market_price": mkt["price"],
        "upside": per_share / mkt["price"] - 1,
        "notes": cfg.get("notes", []),
    }


def run(snapshot_dir: Path, config_dir: Path) -> dict:
    manifest = json.loads((snapshot_dir / "manifest.json").read_text())
    mkt = json.loads((snapshot_dir / "market.json").read_text())
    rates = json.loads((snapshot_dir / "rates.json").read_text())
    out = {"snapshot_date": manifest["snapshot_date"], "valuations": {}}
    for t in manifest["tickers"]:
        rec = json.loads((snapshot_dir / f"{t}.json").read_text())
        cfg = load_config(config_dir / f"{t}.yaml")
        out["valuations"][t] = value_ticker(rec, mkt[t], rates, cfg)
    return out
