"""Unit tests for the loaders with the network mocked out."""

from types import SimpleNamespace

import pytest

from dcf.data import edgar, http, rates


def _dur(val, start, end, form="10-K", filed="2024-02-01"):
    return {"val": val, "start": start, "end": end, "form": form, "filed": filed, "accn": "x"}


def _inst(val, end, filed="2024-02-01"):
    return {"val": val, "end": end, "form": "10-K", "filed": filed, "accn": "x"}


def _facts():
    years = [
        (2019, "2019-01-01", "2019-12-31"),
        (2020, "2020-01-01", "2020-12-31"),
        (2021, "2021-01-01", "2021-12-31"),
    ]
    g = {}

    def put(tag, items, unit="USD"):
        g[tag] = {"units": {unit: items}}

    # Revenue tag changes in 2020 -> fallback must be used and recorded.
    put("Revenues", [_dur(100, *years[0][1:])])
    put(
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        [
            _dur(110, *years[1][1:]),
            _dur(120, *years[2][1:]),
            _dur(30, "2021-01-01", "2021-03-31", form="10-Q"),
        ],
    )
    put("PaymentsToAcquirePropertyPlantAndEquipment", [_dur(10, *y[1:]) for y in years])
    put("AssetsCurrent", [_inst(50, y[2]) for y in years])
    put("LongTermDebtNoncurrent", [_inst(40, y[2]) for y in years])
    put("CommercialPaper", [_inst(5, y[2]) for y in years])
    put(
        "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
        [_dur(20, *y[1:]) for y in years],
    )
    put("InterestExpense", [_dur(2, *y[1:]) for y in years])
    # A restated value filed later must win.
    g["AssetsCurrent"]["units"]["USD"].append(_inst(55, "2021-12-31", filed="2025-02-01"))
    put(
        "WeightedAverageNumberOfDilutedSharesOutstanding",
        [_dur(1e9, *y[1:]) for y in years],
        unit="shares",
    )
    return {"cik": 1, "entityName": "TestCo", "facts": {"us-gaap": g}}


def test_extract_fallbacks_and_provenance():
    rec = edgar.extract(_facts(), "TST", n_years=6)
    assert [y["fiscal_year"] for y in rec["years"]] == [2019, 2020, 2021]
    y19, y20, y21 = rec["years"]
    assert y19["revenue"] == 100 and y19["sources"]["revenue"]["tag"] == "Revenues"
    assert y20["revenue"] == 110
    assert y20["sources"]["revenue"]["tag"] == "RevenueFromContractWithCustomerExcludingAssessedTax"
    assert y21["revenue"] == 120  # 10-Q quarter ignored
    assert y21["current_assets"] == 55  # latest filing wins
    assert y21["total_debt"] == 45
    assert y21["diluted_shares"] == 1e9
    # OperatingIncomeLoss missing -> derived EBIT
    assert y21["operating_income"] == 22
    assert y21["sources"]["operating_income"]["tag"].startswith("derived")
    cov = edgar.coverage(rec)
    assert "RevenueFromContractWithCustomerExcludingAssessedTax" in cov["fallback_tags"]["revenue"]
    assert "2021:tax_expense" in cov["gaps"]


def test_52_53_week_fiscal_year():
    assert edgar.fiscal_year_of("2021-01-03") == 2020
    assert edgar.fiscal_year_of("2025-09-27") == 2025


def test_fetch_companyfacts_uses_url_and_user_agent(monkeypatch):
    seen = {}

    def fake_get(url, headers, timeout):
        seen["url"], seen["ua"] = url, headers["User-Agent"]
        return SimpleNamespace(
            status_code=200, raise_for_status=lambda: None, json=lambda: {"ok": True}
        )

    monkeypatch.setattr(http.requests, "get", fake_get)
    assert edgar.fetch_companyfacts(320193) == {"ok": True}
    assert seen["url"].endswith("CIK0000320193.json")
    assert seen["ua"] == http.DEFAULT_USER_AGENT
    assert "@" in http.FALLBACK_USER_AGENT  # SEC wants "Name email"


def test_rate_limiter_spaces_calls(monkeypatch):
    t = {"now": 0.0}
    slept = []
    monkeypatch.setattr(http.time, "monotonic", lambda: t["now"])
    monkeypatch.setattr(http.time, "sleep", lambda s: slept.append(s))
    lim = http.RateLimiter(0.2)
    lim.wait()
    t["now"] = 0.05
    lim.wait()
    assert slept and slept[0] == pytest.approx(0.15)


def test_fred_parse_skips_missing():
    text = "observation_date,DGS10\n2026-10-19,4.10\n2026-10-20,.\n2026-10-21,\n"
    assert rates.parse_fred_csv(text) == [("2026-10-19", 4.10)]


def test_fetch_dgs10(monkeypatch):
    text = "observation_date,DGS10\n2026-10-19,4.10\n2026-10-20,4.12\n"
    monkeypatch.setattr(rates.http, "get", lambda url, limiter=None: SimpleNamespace(text=text))
    r = rates.fetch_dgs10()
    assert r["observation_date"] == "2026-10-20" and r["yield"] == pytest.approx(0.0412)


def test_market_with_fake_yfinance(monkeypatch):
    import sys

    import pandas as pd

    from dcf.data import market

    class FakeTicker:
        def __init__(self, t):
            self.info = {
                "currentPrice": 10.0,
                "sharesOutstanding": 5e8,
                "beta": 1.1,
                "currency": "USD",
                "marketCap": 5e9,
            }

        def history(self, period, auto_adjust):
            idx = pd.to_datetime(["2026-10-20", "2026-10-21"])
            return pd.DataFrame({"Close": [9.5, 9.9]}, index=idx)

    monkeypatch.setitem(sys.modules, "yfinance", SimpleNamespace(Ticker=FakeTicker))
    m = market.fetch_market("TST")
    assert m["price"] == 10.0 and m["beta"] == 1.1 and m["last_close_date"] == "2026-10-21"
