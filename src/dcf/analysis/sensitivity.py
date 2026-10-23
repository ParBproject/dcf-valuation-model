"""WACC x g grid and tornado (one-at-a-time driver shocks)."""

from __future__ import annotations

from ..model import terminal, valuation

WACC_STEPS = [-0.02, -0.01, 0.0, 0.01, 0.02]
G_VALUES = [0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04]

# driver -> absolute shock (+/-)
TORNADO_SHOCKS = {
    "growth_start": 0.02,
    "target_margin": 0.02,
    "wacc": 0.01,
    "terminal_growth": 0.005,
    "capex_to_rev": 0.01,
    "tax_rate": 0.02,
}


def _safe(p: dict, **over) -> float | None:
    try:
        return valuation.price(p, **over)
    except terminal.TerminalGrowthError:
        return None


def grid(p: dict) -> dict:
    waccs = [p["wacc"] + d for d in WACC_STEPS]
    return {
        "wacc": waccs,
        "g": G_VALUES,
        "price": [[_safe(p, wacc=w, terminal_growth=g) for g in G_VALUES] for w in waccs],
    }


def tornado(p: dict) -> list[dict]:
    base = valuation.price(p)
    out = []
    for k, s in TORNADO_SHOCKS.items():
        lo, hi = _safe(p, **{k: p[k] - s}), _safe(p, **{k: p[k] + s})
        out.append(
            {
                "driver": k,
                "shock": s,
                "base_value": p[k],
                "price_low_input": lo,
                "price_high_input": hi,
                "swing": None if lo is None or hi is None else abs(hi - lo),
            }
        )
    out.sort(key=lambda r: -(r["swing"] or 0))
    return [{"base_price": base, **r} for r in out]
