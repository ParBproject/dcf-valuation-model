"""Reverse DCF: the constant revenue growth over the explicit forecast that sets
intrinsic value equal to the market price. Terminal growth and ROIC are unchanged.

Two variants: margins revert to the base-case target, and margins stay at the last
actual. Holding margins avoids a higher implied growth when the base case mean-reverts
downward."""

from __future__ import annotations

from ..model import valuation

LO, HI = -0.30, 0.80


def _f(p: dict, g: float) -> float:
    return valuation.price(p, growth_path=[g] * p["forecast_years"]) - p["market_price"]


def implied_growth(p: dict, tol: float = 1e-7) -> dict:
    out = _solve(p, tol)
    held = _solve({**p, "target_margin": p["base_margin"]}, tol)
    out["implied_growth_margin_held"] = held["implied_growth"]
    out["years"] = p["forecast_years"]
    return out


def _solve(p: dict, tol: float) -> dict:
    flo, fhi = _f(p, LO), _f(p, HI)
    if flo * fhi > 0:
        return {
            "implied_growth": None,
            "status": "no root in [-30%, 80%]",
            "note": "price unreachable by growth alone (margin/capex dominate)",
        }
    a, b = LO, HI
    for _ in range(200):
        m = (a + b) / 2
        fm = _f(p, m)
        if abs(fm) < 1e-6 or b - a < tol:
            break
        if (fm > 0) == (fhi > 0):
            b = m
        else:
            a = m
    return {"implied_growth": m, "status": "ok", "historical_cagr": p["drivers"]["revenue_cagr"]}
