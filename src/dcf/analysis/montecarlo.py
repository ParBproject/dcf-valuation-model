"""Monte Carlo on the DCF (vectorised NumPy, fixed seed).

Distributions (per draw, independent):
  growth_start   ~ Normal(base, 0.03)                 clipped to [-0.10, 0.25]
  target_margin  ~ Normal(base, 0.02)                 clipped to [0.01, 0.60]
  wacc           ~ Normal(base, 0.01)                 clipped to [rf, 0.20]
  terminal g     ~ Triangular(0.01, base, 0.035)
  Constraint: g < wacc. Draws with g >= wacc - 0.005 are rejected and redrawn, so every
  kept draw has a finite Gordon value.
Everything else (capex/D&A/NWC ratios, tax, debt, cash, shares) is held at base.
"""

from __future__ import annotations

import numpy as np

from ..model.forecast import linear_path

SEED = 20261022
N_DRAWS = 10_000
SPREAD = 0.005
PCTS = [5, 25, 50, 75, 95]


def _draw(p: dict, n: int, rng: np.random.Generator) -> dict[str, np.ndarray]:
    gs = np.clip(rng.normal(p["growth_start"], 0.03, n), -0.10, 0.25)
    m = np.clip(rng.normal(p["target_margin"], 0.02, n), 0.01, 0.60)
    w = np.clip(rng.normal(p["wacc"], 0.01, n), p["rf"], 0.20)
    g = rng.triangular(0.01, p["terminal_growth"], 0.035, n)
    bad = g >= w - SPREAD
    while bad.any():  # rejection sampling on the joint (w, g) constraint
        k = int(bad.sum())
        w[bad] = np.clip(rng.normal(p["wacc"], 0.01, k), p["rf"], 0.20)
        g[bad] = rng.triangular(0.01, p["terminal_growth"], 0.035, k)
        bad = g >= w - SPREAD
    return {"growth_start": gs, "target_margin": m, "wacc": w, "g": g}


def prices(p: dict, n: int = N_DRAWS, seed: int = SEED) -> np.ndarray:
    rng = np.random.default_rng(seed)
    d = _draw(p, n, rng)
    years = p["forecast_years"]
    t = p["tax_rate"]
    rev_prev = np.full(n, p["base_revenue"])
    pv = np.zeros(n)
    fcf = np.zeros(n)
    for i in range(years):
        # same linear fades as forecast.project
        frac = i / (years - 1) if years > 1 else 1.0
        gi = d["growth_start"] + (d["g"] - d["growth_start"]) * frac
        mi = p["base_margin"] + (d["target_margin"] - p["base_margin"]) * (i + 1) / years
        rev = rev_prev * (1 + gi)
        fcf = (
            rev * mi * (1 - t)
            + rev * p["da_to_rev"]
            - rev * p["capex_to_rev"]
            - p["nwc_to_rev"] * (rev - rev_prev)
        )
        pv += fcf / (1 + d["wacc"]) ** (i + 1)
        rev_prev = rev
    tv = fcf * (1 + d["g"]) / (d["wacc"] - d["g"])
    ev = pv + tv / (1 + d["wacc"]) ** years
    return (ev - p["debt"] + p["cash"]) / p["shares"]


def summary(p: dict, n: int = N_DRAWS, seed: int = SEED, bins: int = 40) -> dict:
    x = prices(p, n, seed)
    lo, hi = np.percentile(x, [1, 99])
    counts, edges = np.histogram(np.clip(x, lo, hi), bins=bins, range=(lo, hi))
    return {
        "n_draws": n,
        "seed": seed,
        "percentiles": {
            f"p{q}": float(v) for q, v in zip(PCTS, np.percentile(x, PCTS), strict=True)
        },
        "mean": float(x.mean()),
        "prob_value_gt_price": float((x > p["market_price"]).mean()),
        "histogram": {
            "edges": [float(e) for e in edges],
            "counts": [int(c) for c in counts],
            "clipped_to": "P1-P99 (tails folded into end bins)",
        },
    }


__all__ = ["summary", "prices", "linear_path"]
