"""M3.5 calibration review: decompose the gap between the M3 and M3.5 base values, and
run one-at-a-time sensitivities that were considered but NOT adopted in the base case.

Every step re-runs the real model on the dated snapshot; nothing here is hand-entered.
"""

from __future__ import annotations

import copy
from pathlib import Path

from ..model import valuation
from . import reverse_dcf

M35_FIELDS = (
    "short_term_investments",
    "finance_receivables_current",
    "finance_receivables_noncurrent",
)


def _strip_supplement(rec: dict) -> dict:
    r = copy.deepcopy(rec)
    for y in r["years"]:
        for k in M35_FIELDS:
            y[k] = None
    return r


def _params(snap: dict, t: str, cfg: dict, rec: dict | None = None, rates: dict | None = None):
    return valuation.build_params(
        rec or snap["records"][t], snap["market"][t], rates or snap["rates"], cfg, snap["prices"]
    )


STEPS = [
    ("m3", "M3 as published (5y, final-year FCF carried into perpetuity, no fixes)"),
    ("sti", "+ short-term investments treated as cash, not working capital"),
    ("captive", "+ CAT Financial receivables netted against debt (CAT only)"),
    ("roic", "+ terminal reinvestment = g / ROIC (ROIC 15%)"),
    ("horizon", "+ 10-year explicit period (= M3.5 base)"),
]


def implied_wacc(p: dict, lo: float = 0.03, hi: float = 0.20) -> float | None:
    """Discount rate at which the base-case value equals the market price."""
    f = lambda w: valuation.price(p, wacc=w) - p["market_price"]  # noqa: E731
    lo = max(lo, p["terminal_growth"] + 0.0025)
    if f(lo) * f(hi) > 0:
        return None
    for _ in range(100):
        m = (lo + hi) / 2
        if (f(m) > 0) == (f(lo) > 0):
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


def decompose(snapshot_dir: Path, config_dir: Path) -> dict:
    snap = valuation.load_snapshot(snapshot_dir)
    out: dict = {}
    for t in snap["records"]:
        cfg = valuation.load_config(config_dir / f"{t}.yaml")
        legacy = {**cfg, "forecast_years": 5, "terminal_roic": None, "captive_finance": False}
        raw = _strip_supplement(snap["records"][t])
        variants = {
            "m3": _params(snap, t, legacy, raw),
            "sti": _params(snap, t, legacy),
            "captive": _params(
                snap, t, {**legacy, "captive_finance": cfg.get("captive_finance", False)}
            ),
            "roic": _params(snap, t, {**cfg, "forecast_years": 5}),
            "horizon": _params(snap, t, cfg),
        }
        steps = []
        prev = None
        for key, label in STEPS:
            v = valuation.price(variants[key])
            steps.append(
                {
                    "step": key,
                    "label": label,
                    "price": v,
                    "delta": None if prev is None else v - prev,
                }
            )
            prev = v
        base = variants["horizon"]
        jan = copy.deepcopy(snap["rates"])
        jan["yield"] = 0.0418  # T-bond rate Damodaran paired with the 4.23% ERP (Jan 2026)
        sens = {
            "margin_held_at_last": valuation.price(base, target_margin=base["base_margin"]),
            "terminal_roic_25pct": valuation.price(base, terminal_roic=0.25),
            "terminal_roic_eq_wacc": valuation.price(base, terminal_roic=base["wacc"]),
            "capex_minus_1pp": valuation.price(base, capex_to_rev=base["capex_to_rev"] - 0.01),
            "exit_multiple_tv": valuation.price(base, detail=True)["implied_price_exit_multiple"],
            "rf_4_18_with_erp_4_23": valuation.price(_params(snap, t, cfg, rates=jan)),
        }
        rv = reverse_dcf.implied_growth(base)
        out[t] = {
            "market_price": base["market_price"],
            "steps": steps,
            "sensitivities": sens,
            "wacc": base["wacc"],
            "wacc_m3": variants["m3"]["wacc"],
            "implied_wacc": implied_wacc(base),
            "implied_growth": rv["implied_growth"],
            "implied_growth_margin_held": rv["implied_growth_margin_held"],
        }
    return out
