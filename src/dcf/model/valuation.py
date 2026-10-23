"""End-to-end valuation from a snapshot + per-ticker YAML config.

`build_params` turns raw inputs into a flat parameter dict once; `price` values a
parameter dict (with optional overrides), so sensitivity / Monte Carlo / reverse DCF
reuse exactly the same math as the base case.
"""

from __future__ import annotations

import json
from pathlib import Path

import yaml

from ..data.prices import monthly_returns
from . import fcf, forecast, terminal, wacc

TERMINAL_ROIC = 0.15  # return on new invested capital in perpetuity (see docs/calibration.md)


def terminal_fcf(nopat_final: float, g: float, roic: float) -> float:
    """Steady-state FCF in the final year: reinvestment rate = g / ROIC (value-driver
    formula). Replaces carrying explicit-period capex - D&A into perpetuity."""
    return nopat_final * (1 - g / roic)


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


def beta_estimates(ticker: str, mkt: dict, prices: dict | None) -> dict:
    out = {"yfinance": mkt["beta"], "regression_raw": None, "regression_blume": None, "n_months": 0}
    if prices:
        s = monthly_returns(prices["close"][ticker])
        m = monthly_returns(prices["close"][prices["benchmark"]])
        raw = wacc.regression_beta(s, m)
        out.update(regression_raw=raw, regression_blume=wacc.blume(raw), n_months=len(s))
    return out


def select_beta(est: dict, cfg: dict) -> tuple[float, str]:
    """Default: Blume-adjusted 5y monthly regression beta; falls back to yfinance."""
    if "beta" in cfg:
        return cfg["beta"], "config override"
    method = cfg.get("beta_method", "regression_blume")
    if method == "yfinance" or est["regression_raw"] is None:
        return est["yfinance"], "yfinance"
    return (
        (est["regression_blume"], method)
        if method == "regression_blume"
        else (est["regression_raw"], "regression_raw")
    )


def build_params(
    record: dict, mkt: dict, rates: dict, cfg: dict, prices: dict | None = None
) -> dict:
    captive = bool(cfg.get("captive_finance"))
    rows = fcf.history(record, captive)
    drv = fcf.drivers(rows)
    last = record["years"][-1]
    rf = rates["yield"]
    erp = rates["equity_risk_premium"]["value"]
    tax = cfg.get("tax_rate", drv["tax_rate"])
    debt = last["total_debt"]
    if cfg.get("exclude_short_term_borrowings"):
        debt -= last.get("short_term_borrowings") or 0.0
    gross_debt = debt
    fin_recv = 0.0
    if captive:
        # Captive-finance debt is funded by (and serviced from) finance receivables, so
        # net it off: only the remaining debt is a claim on the operating business.
        fin_recv = (last.get("finance_receivables_current") or 0.0) + (
            last.get("finance_receivables_noncurrent") or 0.0
        )
        debt = max(debt - fin_recv, 0.0)
    sti = last.get("short_term_investments") or 0.0
    betas = beta_estimates(record["ticker"], mkt, prices)
    beta, beta_method = select_beta(betas, cfg)
    ke = wacc.cost_of_equity(rf, beta, erp)
    interest = None if cfg.get("ignore_interest") else last.get("interest_expense")
    kd, kd_method = wacc.pretax_cost_of_debt(interest, debt, rf, cfg.get("debt_spread", 0.01))
    mcap = mkt["price"] * mkt["shares_outstanding"]
    gs = cfg.get("growth_start", drv["revenue_cagr"])
    gs = min(max(gs, cfg.get("growth_floor", -0.05)), cfg.get("growth_cap", 0.15))
    return {
        "ticker": record["ticker"],
        "base_fiscal_year": last["fiscal_year"],
        "base_revenue": last["revenue"],
        "base_margin": drv["ebit_margin_last"],
        "rf": rf,
        "erp": erp,
        "beta": beta,
        "beta_method": beta_method,
        "betas": betas,
        "cost_of_equity": ke,
        "pretax_cost_of_debt": kd,
        "cost_of_debt_method": kd_method,
        "interest_expense": interest,
        "debt_spread": cfg.get("debt_spread", 0.01),
        "tax_rate": tax,
        "debt": debt,
        "gross_debt": gross_debt,
        "finance_receivables_netted": fin_recv,
        "cash": last["cash"] + sti,
        "short_term_investments": sti,
        "market_cap": mcap,
        "shares": mkt["shares_outstanding"],
        "market_price": mkt["price"],
        "wacc": wacc.wacc(mcap, debt, ke, kd, tax),
        "growth_start": gs,
        "terminal_growth": cfg["terminal_growth"],
        "target_margin": cfg.get("target_margin", drv["ebit_margin_mean"]),
        "capex_to_rev": cfg.get("capex_to_rev", drv["capex_to_rev"]),
        "da_to_rev": cfg.get("da_to_rev", drv["da_to_rev"]),
        "nwc_to_rev": cfg.get("nwc_to_rev", drv["nwc_to_rev"]),
        "exit_ev_ebitda": cfg["exit_ev_ebitda"],
        "forecast_years": cfg.get("forecast_years", 10),
        "terminal_roic": cfg.get("terminal_roic", TERMINAL_ROIC),
        "drivers": drv,
        "historical_fcff": {r.fiscal_year: r.fcff for r in rows},
        "notes": cfg.get("notes", []),
    }


def price(
    p: dict, *, detail: bool = False, growth_path: list[float] | None = None, **over
) -> float | dict:
    q = {**p, **over}
    proj = forecast.project(
        q["base_fiscal_year"],
        q["base_revenue"],
        q["base_margin"],
        growth_start=q["growth_start"],
        terminal_growth=q["terminal_growth"],
        target_margin=q["target_margin"],
        capex_to_rev=q["capex_to_rev"],
        da_to_rev=q["da_to_rev"],
        nwc_to_rev=q["nwc_to_rev"],
        tax_rate=q["tax_rate"],
        years=q["forecast_years"],
        growth_path=growth_path,
    )
    r, g = q["wacc"], q["terminal_growth"]
    roic = q["terminal_roic"]
    # roic=None reproduces the M3 behaviour (final explicit-year FCF carried forward)
    fcf_n = proj[-1].fcff if roic is None else terminal_fcf(proj[-1].nopat, g, roic)
    tv = terminal.gordon(fcf_n, r, g)
    fcfs = [x.fcff for x in proj]
    ev, pv_fcf, pv_tv = enterprise_value(fcfs, tv, r)
    eq, per_share = equity_bridge(ev, q["debt"], q["cash"], q["shares"])
    if not detail:
        return per_share
    ebitda_n = proj[-1].ebit + proj[-1].d_and_a
    ev_x, _, _ = enterprise_value(fcfs, terminal.exit_multiple(ebitda_n, q["exit_ev_ebitda"]), r)
    _, per_share_x = equity_bridge(ev_x, q["debt"], q["cash"], q["shares"])
    return {
        "forecast": [x.__dict__ for x in proj],
        "terminal_value": tv,
        "tv_implied_ev_ebitda": terminal.implied_multiple(tv, ebitda_n),
        "enterprise_value": ev,
        "pv_fcf": pv_fcf,
        "pv_tv": pv_tv,
        "tv_share_of_ev": pv_tv / ev if ev else None,
        "equity_value": eq,
        "implied_price": per_share,
        "implied_price_exit_multiple": per_share_x,
    }


INPUT_KEYS = [
    "rf",
    "erp",
    "beta",
    "beta_method",
    "betas",
    "cost_of_equity",
    "pretax_cost_of_debt",
    "cost_of_debt_method",
    "tax_rate",
    "debt",
    "gross_debt",
    "finance_receivables_netted",
    "cash",
    "short_term_investments",
    "market_cap",
    "shares",
]
ASSUMPTION_KEYS = [
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


def summarize(p: dict, d: dict) -> dict:
    return {
        "ticker": p["ticker"],
        "base_fiscal_year": p["base_fiscal_year"],
        "inputs": {k: p[k] for k in INPUT_KEYS},
        "drivers": p["drivers"],
        "assumptions": {k: p[k] for k in ASSUMPTION_KEYS},
        "historical_fcff": p["historical_fcff"],
        "wacc": p["wacc"],
        **d,
        "market_price": p["market_price"],
        "upside": d["implied_price"] / p["market_price"] - 1,
        "notes": p["notes"],
    }


def value_ticker(
    record: dict, mkt: dict, rates: dict, cfg: dict, prices: dict | None = None
) -> dict:
    p = build_params(record, mkt, rates, cfg, prices)
    return summarize(p, price(p, detail=True))


def load_snapshot(snapshot_dir: Path) -> dict:
    rd = lambda n: json.loads((snapshot_dir / n).read_text())  # noqa: E731
    man = rd("manifest.json")
    return {
        "manifest": man,
        "market": rd("market.json"),
        "rates": rd("rates.json"),
        "prices": rd("prices.json") if (snapshot_dir / "prices.json").exists() else None,
        "records": {t: rd(f"{t}.json") for t in man["tickers"]},
    }


def all_params(snapshot_dir: Path, config_dir: Path) -> tuple[dict, dict]:
    s = load_snapshot(snapshot_dir)
    ps = {
        t: build_params(
            rec, s["market"][t], s["rates"], load_config(config_dir / f"{t}.yaml"), s["prices"]
        )
        for t, rec in s["records"].items()
    }
    return s, ps


def run(snapshot_dir: Path, config_dir: Path) -> dict:
    s, ps = all_params(snapshot_dir, config_dir)
    return {
        "snapshot_date": s["manifest"]["snapshot_date"],
        "valuations": {t: summarize(p, price(p, detail=True)) for t, p in ps.items()},
    }
