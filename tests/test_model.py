"""Hand-checked unit tests for each formula, edge cases, and a reconciliation."""

import json
from pathlib import Path

import pytest

from dcf.model import fcf, forecast, terminal, valuation, wacc

ROOT = Path(__file__).resolve().parents[1]


# --- fcf ---------------------------------------------------------------------------
def test_tax_rate_clamped_and_default():
    assert fcf.effective_tax_rate(20, 100) == pytest.approx(0.20)
    assert fcf.effective_tax_rate(2, 100) == fcf.TAX_FLOOR
    assert fcf.effective_tax_rate(50, 100) == fcf.TAX_CAP
    assert fcf.effective_tax_rate(5, -10) == fcf.TAX_DEFAULT
    assert fcf.effective_tax_rate(None, 100) == fcf.TAX_DEFAULT


def test_fcff_formula():
    # 100*(1-0.25) + 20 - 30 - 5 = 60
    assert fcf.fcff(100, 0.25, 20, 30, 5) == pytest.approx(60)


def test_negative_fcff_is_allowed():
    assert fcf.fcff(10, 0.2, 1, 40, 5) == pytest.approx(-36)


def test_operating_nwc_excludes_cash_and_debt():
    y = {
        "current_assets": 100,
        "cash": 30,
        "current_liabilities": 60,
        "debt_current": 10,
        "short_term_borrowings": 5,
    }
    assert fcf.operating_nwc(y) == pytest.approx(70 - 45)


# --- forecast ----------------------------------------------------------------------
def test_linear_fade_hits_terminal_g():
    assert forecast.linear_path(0.10, 0.02, 5) == pytest.approx([0.10, 0.08, 0.06, 0.04, 0.02])


def test_project_one_year_by_hand():
    (p,) = forecast.project(
        2025,
        1000,
        0.20,
        growth_start=0.10,
        terminal_growth=0.02,
        target_margin=0.30,
        capex_to_rev=0.05,
        da_to_rev=0.04,
        nwc_to_rev=0.10,
        tax_rate=0.25,
        years=1,
    )
    # growth=g (single year), rev=1020, margin=0.30, ebit=306, nopat=229.5,
    # da=40.8, capex=51, dnwc=2 -> 221.3
    assert p.revenue == pytest.approx(1020)
    assert p.fcff == pytest.approx(229.5 + 40.8 - 51 - 2)


def test_margin_reverts_to_target():
    proj = forecast.project(
        2025,
        100,
        0.10,
        growth_start=0.05,
        terminal_growth=0.02,
        target_margin=0.20,
        capex_to_rev=0,
        da_to_rev=0,
        nwc_to_rev=0,
        tax_rate=0.2,
    )
    assert [round(p.ebit_margin, 4) for p in proj] == [0.12, 0.14, 0.16, 0.18, 0.20]


# --- wacc --------------------------------------------------------------------------
def test_capm():
    assert wacc.cost_of_equity(0.04, 1.2, 0.05) == pytest.approx(0.10)


def test_wacc_weights():
    # E=600, D=400, ke=10%, kd=5%, t=25% -> 0.6*0.10 + 0.4*0.05*0.75 = 0.075
    assert wacc.wacc(600, 400, 0.10, 0.05, 0.25) == pytest.approx(0.075)


def test_cost_of_debt_missing_interest_falls_back():
    kd, m = wacc.pretax_cost_of_debt(None, 100, 0.05)
    assert kd == pytest.approx(0.06) and m.startswith("fallback")


def test_cost_of_debt_bounds():
    assert wacc.pretax_cost_of_debt(6, 100, 0.04)[0] == pytest.approx(0.06)
    assert wacc.pretax_cost_of_debt(1, 100, 0.04)[0] == pytest.approx(0.04)  # floored at rf
    assert wacc.pretax_cost_of_debt(50, 100, 0.04)[0] == wacc.COST_OF_DEBT_CAP


def test_regression_beta():
    m = [0.01 * ((i % 7) - 3) for i in range(36)]
    s = [1.5 * x + 0.001 for x in m]
    assert wacc.regression_beta(s, m) == pytest.approx(1.5)
    with pytest.raises(ValueError):
        wacc.regression_beta([0.1], [0.1])


# --- terminal ----------------------------------------------------------------------
def test_gordon():
    assert terminal.gordon(100, 0.08, 0.03) == pytest.approx(103 / 0.05)


@pytest.mark.parametrize("g", [0.08, 0.09])
def test_g_ge_wacc_raises(g):
    with pytest.raises(terminal.TerminalGrowthError):
        terminal.gordon(100, 0.08, g, g_cap=0.2)


def test_g_cap():
    with pytest.raises(terminal.TerminalGrowthError):
        terminal.gordon(100, 0.10, 0.05)


def test_exit_multiple():
    assert terminal.exit_multiple(50, 10) == 500
    assert terminal.implied_multiple(500, 50) == 10


# --- valuation ---------------------------------------------------------------------
def test_ev_and_bridge():
    ev, pv_f, pv_tv = valuation.enterprise_value([100, 100], 1000, 0.10)
    assert pv_f == pytest.approx(100 / 1.1 + 100 / 1.21)
    assert pv_tv == pytest.approx(1000 / 1.21)
    eq, ps = valuation.equity_bridge(ev, 200, 50, 10)
    assert eq == pytest.approx(ev - 150) and ps == pytest.approx((ev - 150) / 10)


def _snap():
    return sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]


def test_reconciliation_ko_spreadsheet_style():
    """Recompute KO's valuation from raw snapshot numbers step by step, independent of
    the model functions, and require agreement to 1e-9 relative."""
    snap = _snap()
    rec = json.loads((snap / "KO.json").read_text())
    mkt = json.loads((snap / "market.json").read_text())["KO"]
    rates = json.loads((snap / "rates.json").read_text())
    cfg = valuation.load_config(ROOT / "config" / "KO.yaml")
    got = valuation.value_ticker(rec, mkt, rates, cfg)

    ys = rec["years"]
    taxes = [min(max(y["tax_expense"] / y["pretax_income"], 0.10), 0.30) for y in ys]
    t = sum(taxes) / len(taxes)
    nwc = [
        (y["current_assets"] - y["cash"])
        - (y["current_liabilities"] - y["debt_current"] - (y["short_term_borrowings"] or 0))
        for y in ys
    ]
    n = len(ys)
    cagr = (ys[-1]["revenue"] / ys[0]["revenue"]) ** (1 / (n - 1)) - 1
    g1 = min(max(cagr, -0.05), 0.15)
    m_mean = sum(y["operating_income"] / y["revenue"] for y in ys) / n
    m_last = ys[-1]["operating_income"] / ys[-1]["revenue"]
    cx = sum(y["capex"] / y["revenue"] for y in ys) / n
    da = sum(y["d_and_a"] / y["revenue"] for y in ys) / n
    nw = sum(v / y["revenue"] for v, y in zip(nwc, ys, strict=True)) / n
    g = 0.025
    rf, erp, beta = rates["yield"], 0.0423, mkt["beta"]
    debt, cash = ys[-1]["total_debt"], ys[-1]["cash"]
    ke = rf + beta * erp
    kd = min(max(ys[-1]["interest_expense"] / debt, rf), 0.15)
    E = mkt["price"] * mkt["shares_outstanding"]
    w = E / (E + debt) * ke + debt / (E + debt) * kd * (1 - t)

    rev, pv, fcfs = ys[-1]["revenue"], 0.0, []
    for i in range(5):
        gi = g1 + (g - g1) * i / 4
        mi = m_last + (m_mean - m_last) * (i + 1) / 5
        new = rev * (1 + gi)
        f = new * mi * (1 - t) + new * da - new * cx - nw * (new - rev)
        fcfs.append(f)
        pv += f / (1 + w) ** (i + 1)
        rev = new
    tv = fcfs[-1] * (1 + g) / (w - g)
    ev = pv + tv / (1 + w) ** 5
    price = (ev - debt + cash) / mkt["shares_outstanding"]

    assert got["wacc"] == pytest.approx(w, rel=1e-9)
    assert got["enterprise_value"] == pytest.approx(ev, rel=1e-9)
    assert got["implied_price"] == pytest.approx(price, rel=1e-9)


def test_missing_interest_uses_fallback_in_full_run():
    res = valuation.run(_snap(), ROOT / "config")
    aapl = res["valuations"]["AAPL"]["inputs"]
    assert aapl["cost_of_debt_method"] == "fallback:rf+spread"
    assert aapl["pretax_cost_of_debt"] == pytest.approx(aapl["rf"] + 0.01)


def test_full_run_sane_and_matches_committed_results():
    res = valuation.run(_snap(), ROOT / "config")
    for t, v in res["valuations"].items():
        assert v["assumptions"]["terminal_growth"] < v["wacc"], t
        assert 0 < v["tv_share_of_ev"] < 1, t
        assert v["implied_price"] > 0, t
    committed = json.loads((ROOT / "results" / "base_valuations.json").read_text())
    for t, v in res["valuations"].items():
        assert committed["valuations"][t]["implied_price"] == pytest.approx(v["implied_price"])
