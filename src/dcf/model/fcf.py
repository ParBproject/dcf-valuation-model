"""Historical free cash flow and driver ratios.

FCFF = EBIT * (1 - t) + D&A - capex - change in NWC

* t is the effective tax rate (tax expense / pretax income), clamped to
  [TAX_FLOOR, TAX_CAP]; if pretax income <= 0 the default rate is used.
* NWC is operating: (current assets - cash) - (current liabilities - current debt
  - short-term borrowings), so financing items stay out of working capital.
* Short-term investments (marketable securities outside "cash") are financial assets:
  they are excluded from NWC and added to cash in the equity bridge (M3.5 fix).
* Captive finance (CAT Financial): with `captive=True`, current finance receivables are
  also excluded from NWC; the model nets total finance receivables against debt.
* The first historical year has no prior NWC, so it gets no FCF (None).
"""

from __future__ import annotations

from dataclasses import dataclass

TAX_FLOOR = 0.10
TAX_CAP = 0.30
TAX_DEFAULT = 0.21  # US federal statutory rate, used when pretax income <= 0


def effective_tax_rate(
    tax_expense: float | None,
    pretax_income: float | None,
    floor: float = TAX_FLOOR,
    cap: float = TAX_CAP,
    default: float = TAX_DEFAULT,
) -> float:
    if tax_expense is None or pretax_income is None or pretax_income <= 0:
        return default
    return min(max(tax_expense / pretax_income, floor), cap)


def operating_nwc(year: dict, captive: bool = False) -> float:
    cur_debt = (year.get("debt_current") or 0.0) + (year.get("short_term_borrowings") or 0.0)
    fin = (year.get("short_term_investments") or 0.0) + (
        (year.get("finance_receivables_current") or 0.0) if captive else 0.0
    )
    return (year["current_assets"] - year["cash"] - fin) - (year["current_liabilities"] - cur_debt)


def fcff(ebit: float, tax_rate: float, d_and_a: float, capex: float, delta_nwc: float) -> float:
    """capex is a positive outflow (as tagged in PaymentsToAcquire*)."""
    return ebit * (1.0 - tax_rate) + d_and_a - capex - delta_nwc


@dataclass
class HistoryRow:
    fiscal_year: int
    revenue: float
    ebit: float
    tax_rate: float
    d_and_a: float
    capex: float
    nwc: float
    delta_nwc: float | None
    fcff: float | None


def history(record: dict, captive: bool = False) -> list[HistoryRow]:
    rows: list[HistoryRow] = []
    prev_nwc: float | None = None
    for y in record["years"]:
        nwc = operating_nwc(y, captive)
        t = effective_tax_rate(y["tax_expense"], y["pretax_income"])
        ebit = y["operating_income"]
        dn = None if prev_nwc is None else nwc - prev_nwc
        f = None if dn is None else fcff(ebit, t, y["d_and_a"], y["capex"], dn)
        rows.append(
            HistoryRow(
                y["fiscal_year"], y["revenue"], ebit, t, y["d_and_a"], y["capex"], nwc, dn, f
            )
        )
        prev_nwc = nwc
    return rows


def _mean(xs: list[float]) -> float:
    return sum(xs) / len(xs)


def drivers(rows: list[HistoryRow]) -> dict[str, float]:
    """Average historical ratios used to seed the forecast."""
    growth = [b.revenue / a.revenue - 1 for a, b in zip(rows, rows[1:], strict=False)]
    n = len(rows) - 1
    return {
        "revenue_cagr": (rows[-1].revenue / rows[0].revenue) ** (1 / n) - 1,
        "mean_growth": _mean(growth),
        "ebit_margin_mean": _mean([r.ebit / r.revenue for r in rows]),
        "ebit_margin_last": rows[-1].ebit / rows[-1].revenue,
        "capex_to_rev": _mean([r.capex / r.revenue for r in rows]),
        "capex_to_rev_last": rows[-1].capex / rows[-1].revenue,
        "da_to_rev": _mean([r.d_and_a / r.revenue for r in rows]),
        "nwc_to_rev": _mean([r.nwc / r.revenue for r in rows]),
        "tax_rate": _mean([r.tax_rate for r in rows]),
    }
