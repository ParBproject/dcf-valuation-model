"""Offline checks on the committed, dated snapshot."""

import math

import pytest

from dcf.data.edgar import FIELDS, REQUIRED
from dcf.data.sources import DAMODARAN_ERP, TICKERS

from .conftest import latest_snapshot, load

SNAP = latest_snapshot()


def test_manifest(manifest, snap_dir):
    assert manifest["snapshot_date"] == snap_dir.name
    assert set(manifest["tickers"]) == set(TICKERS)
    for name, meta in manifest["files"].items():
        assert (snap_dir / name).exists()
        assert meta["source"] and meta["fetched_at"]
    assert {c["ticker"] for c in manifest["coverage"]} == set(TICKERS)


@pytest.mark.parametrize("ticker", list(TICKERS))
class TestTicker:
    def rec(self, ticker):
        return load(SNAP, f"{ticker}.json")

    def test_schema(self, ticker):
        r = self.rec(ticker)
        assert r["ticker"] == ticker
        assert int(r["cik"]) == TICKERS[ticker]
        for y in r["years"]:
            for key in [*FIELDS, "total_debt", "fiscal_year", "period_end", "sources"]:
                assert key in y

    def test_at_least_five_consecutive_years(self, ticker):
        fys = [y["fiscal_year"] for y in self.rec(ticker)["years"]]
        assert len(fys) >= 5
        assert fys == list(range(fys[0], fys[0] + len(fys)))

    def test_required_fields_present(self, ticker):
        for y in self.rec(ticker)["years"]:
            for k in REQUIRED:
                v = y[k]
                assert v is not None and not math.isnan(v), (ticker, y["fiscal_year"], k)

    def test_provenance_recorded(self, ticker):
        for y in self.rec(ticker)["years"]:
            for k in REQUIRED:
                if k == "total_debt":
                    continue
                assert y["sources"][k]["tag"]

    def test_sanity(self, ticker):
        for y in self.rec(ticker)["years"]:
            assert y["revenue"] > 0
            assert y["capex"] > 0  # PaymentsToAcquire* tags are positive cash outflows
            assert y["capex"] < y["revenue"]
            assert y["d_and_a"] > 0
            assert y["diluted_shares"] > 1e8
            assert y["current_assets"] > 0 and y["current_liabilities"] > 0
            assert y["cash"] >= 0 and y["total_debt"] >= 0
            assert y["pretax_income"] < y["revenue"]
            if y["operating_income"] is not None:
                assert abs(y["operating_income"]) < y["revenue"]


def test_market():
    m = load(SNAP, "market.json")
    assert set(m) == set(TICKERS)
    for t, v in m.items():
        assert v["price"] > 0, t
        assert v["shares_outstanding"] > 1e8, t
        assert v["beta"] is not None and -1 < v["beta"] < 4, t
        assert v["currency"] == "USD"


def test_market_shares_close_to_sec_diluted():
    m = load(SNAP, "market.json")
    for t in TICKERS:
        sec = load(SNAP, f"{t}.json")["years"][-1]["diluted_shares"]
        assert 0.8 < m[t]["shares_outstanding"] / sec < 1.2, t


def test_rates():
    r = load(SNAP, "rates.json")
    assert r["series"] == "DGS10"
    assert 0.0 < r["yield"] < 0.15
    assert r["yield"] == pytest.approx(r["yield_pct"] / 100)
    assert r["equity_risk_premium"]["value"] == DAMODARAN_ERP
