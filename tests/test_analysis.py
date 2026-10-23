"""Tests for beta handling, sensitivity, Monte Carlo, reverse DCF and the results file."""

import json
from pathlib import Path

import numpy as np
import pytest

from dcf.analysis import montecarlo, results, reverse_dcf, sensitivity
from dcf.model import valuation, wacc

ROOT = Path(__file__).resolve().parents[1]
SNAP = sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]
_, PARAMS = valuation.all_params(SNAP, ROOT / "config")
COMMITTED = json.loads((ROOT / "results" / "valuations.json").read_text())


def test_blume():
    assert wacc.blume(1.0) == pytest.approx(1.0)
    assert wacc.blume(0.2) == pytest.approx(0.464)


def test_beta_selection_and_fallback():
    est = {"yfinance": 0.9, "regression_raw": 0.5, "regression_blume": 0.665}
    assert valuation.select_beta(est, {}) == (0.665, "regression_blume")
    assert valuation.select_beta(est, {"beta_method": "regression_raw"})[0] == 0.5
    assert valuation.select_beta(est, {"beta_method": "yfinance"})[0] == 0.9
    assert valuation.select_beta({**est, "regression_raw": None}, {})[1] == "yfinance"
    assert valuation.select_beta(est, {"beta": 1.2}) == (1.2, "config override")


def test_prices_snapshot_has_five_years():
    px = json.loads((SNAP / "prices.json").read_text())
    assert len(px["dates"]) >= 59 and px["benchmark"] == "^GSPC"
    for s in [*PARAMS, "^GSPC"]:
        assert len(px["close"][s]) == len(px["dates"]) and min(px["close"][s]) > 0


@pytest.mark.parametrize("t", list(PARAMS))
def test_regression_beta_close_to_yfinance(t):
    b = PARAMS[t]["betas"]
    assert abs(b["regression_raw"] - b["yfinance"]) < 0.15  # both 5y monthly vs S&P 500


def test_grid_shape_and_monotonic():
    gr = sensitivity.grid(PARAMS["KO"])
    assert len(gr["price"]) == 5 and all(len(r) == 7 for r in gr["price"])
    mid = gr["price"][2]
    vals = [v for v in mid if v is not None]
    assert vals == sorted(vals)  # higher g -> higher value at fixed WACC
    col = [r[0] for r in gr["price"]]
    assert col == sorted(col, reverse=True)  # higher WACC -> lower value


def test_grid_marks_invalid_cells():
    p = {**PARAMS["XOM"], "wacc": 0.045}  # WACC-2% = 2.5% -> g >= wacc cells
    gr = sensitivity.grid(p)
    assert any(v is None for v in gr["price"][0])


def test_tornado_sorted_and_directions():
    tor = sensitivity.tornado(PARAMS["AAPL"])
    swings = [r["swing"] for r in tor]
    assert swings == sorted(swings, reverse=True)
    w = next(r for r in tor if r["driver"] == "wacc")
    assert w["price_high_input"] < w["base_price"] < w["price_low_input"]


def test_mc_finite_and_median_near_base():
    """Draws are finite, respect g < WACC, and centre near the base-case price."""
    p = PARAMS["MSFT"]
    rng = np.random.default_rng(0)
    d = montecarlo._draw(p, 5, rng)
    assert (d["g"] < d["wacc"]).all()
    x = montecarlo.prices(p, n=200, seed=1)
    assert np.isfinite(x).all()
    base = valuation.price(p)
    assert np.median(x) == pytest.approx(base, rel=0.15)


def test_mc_g_below_wacc_enforced():
    p = {**PARAMS["XOM"], "wacc": 0.04, "rf": 0.03}
    d = montecarlo._draw(p, 2000, np.random.default_rng(3))
    assert (d["g"] < d["wacc"] - montecarlo.SPREAD + 1e-12).all()


def test_mc_reproducible_small():
    a = montecarlo.summary(PARAMS["KO"], n=500)
    b = montecarlo.summary(PARAMS["KO"], n=500)
    assert a == b and sum(a["histogram"]["counts"]) == 500


def test_mc_pinned_full_run():
    s = montecarlo.summary(PARAMS["JNJ"])
    ref = COMMITTED["tickers"]["JNJ"]["monte_carlo"]
    assert s["n_draws"] == 10_000
    for k in ("p5", "p50", "p95"):
        assert s["percentiles"][k] == pytest.approx(ref["percentiles"][k], rel=1e-9)
    assert s["prob_value_gt_price"] == ref["prob_value_gt_price"]


@pytest.mark.parametrize("t", list(PARAMS))
def test_reverse_dcf_reproduces_market_price(t):
    p = PARAMS[t]
    r = reverse_dcf.implied_growth(p)
    assert r["status"] == "ok"
    g = r["implied_growth"]
    v = valuation.price(p, growth_path=[g] * p["forecast_years"])
    assert v == pytest.approx(p["market_price"], rel=1e-4)


def test_results_schema():
    assert COMMITTED["schema_version"] == results.SCHEMA_VERSION
    assert COMMITTED["snapshot_date"] == SNAP.name
    for v in COMMITTED["tickers"].values():
        assert set(v) == {
            "base",
            "scenarios",
            "sensitivity",
            "tornado",
            "monte_carlo",
            "reverse_dcf",
            "engine",
        }
        sc = v["scenarios"]
        assert (
            sc["bear"]["implied_price"] < sc["base"]["implied_price"] < sc["bull"]["implied_price"]
        )


PINNED = {  # M3.5 headline base-case implied prices, snapshot 2026-10-22
    "AAPL": 122.18,
    "MSFT": 311.52,
    "KO": 51.38,
    "JNJ": 182.75,
    "CAT": 279.82,
    "XOM": 216.26,
}

M3_PINNED = {  # M3 values; the calibration 'm3' step must reproduce them exactly
    "AAPL": 116.81,
    "MSFT": 200.76,
    "KO": 49.97,
    "JNJ": 216.55,
    "CAT": 233.89,
    "XOM": 242.42,
}


@pytest.mark.parametrize("t", list(PINNED))
def test_pinned_headlines(t):
    assert COMMITTED["tickers"][t]["base"]["implied_price"] == pytest.approx(PINNED[t], abs=0.01)


def test_fresh_run_matches_committed_file():
    fresh = json.loads(
        json.dumps(results.build(SNAP, ROOT / "config", n_draws=10_000), default=float)
    )
    assert fresh == COMMITTED


@pytest.mark.parametrize("t", list(M3_PINNED))
def test_calibration_reproduces_m3_then_m35(t):
    cal = json.loads((ROOT / "results" / "calibration.json").read_text())["tickers"][t]
    steps = {x["step"]: x["price"] for x in cal["steps"]}
    assert steps["m3"] == pytest.approx(M3_PINNED[t], abs=0.01)
    assert steps["horizon"] == pytest.approx(PINNED[t], abs=0.01)


def test_calibration_file_is_fresh():
    from dcf.analysis.calibration import decompose

    fresh = json.loads(json.dumps(decompose(SNAP, ROOT / "config"), default=float))
    assert fresh == json.loads((ROOT / "results" / "calibration.json").read_text())["tickers"]


@pytest.mark.parametrize("t", ["AAPL", "MSFT", "CAT"])
def test_reverse_dcf_margin_held_reproduces_price(t):
    p = PARAMS[t]
    rv = reverse_dcf.implied_growth(p)
    g = rv["implied_growth_margin_held"]
    q = {**p, "target_margin": p["base_margin"]}
    v = valuation.price(q, growth_path=[g] * p["forecast_years"])
    assert v == pytest.approx(p["market_price"], rel=1e-4)
    assert g <= rv["implied_growth"] + 1e-9


def test_bull_scenario_is_documented_set_not_tuned():
    bull = COMMITTED["tickers"]["MSFT"]["scenarios"]["bull"]
    p = PARAMS["MSFT"]
    assert bull["assumptions"]["target_margin"] == pytest.approx(p["base_margin"])
    assert bull["assumptions"]["terminal_roic"] == 0.25
    assert bull["assumptions"]["capex_to_rev"] == pytest.approx(p["capex_to_rev"] - 0.01)


def test_engine_block_and_parity_fixtures_are_fresh():
    """The TS engine's inputs and parity fixtures must come from the current model."""
    fx = json.loads((ROOT / "web" / "src" / "engine" / "__fixtures__" / "parity.json").read_text())
    assert fx["snapshot_date"] == SNAP.name
    for t, p in PARAMS.items():
        eng = results.engine_params(p)
        assert COMMITTED["tickers"][t]["engine"] == json.loads(json.dumps(eng))
        assert fx["tickers"][t]["params"] == json.loads(json.dumps(eng))
        base = next(c for c in fx["tickers"][t]["cases"] if c["name"] == "base")
        assert base["expected"]["implied_price"] == pytest.approx(
            COMMITTED["tickers"][t]["base"]["implied_price"], rel=1e-12
        )
