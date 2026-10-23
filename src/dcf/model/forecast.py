"""Five-year FCFF forecast with growth fading linearly to terminal g and EBIT margin
mean-reverting linearly from the last actual to the target margin."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ForecastYear:
    year: int
    growth: float
    revenue: float
    ebit_margin: float
    ebit: float
    nopat: float
    d_and_a: float
    capex: float
    delta_nwc: float
    fcff: float


def linear_path(start: float, end: float, n: int) -> list[float]:
    """n values from start (t=1) to end (t=n) inclusive."""
    if n == 1:
        return [end]
    return [start + (end - start) * i / (n - 1) for i in range(n)]


def project(
    base_year: int,
    base_revenue: float,
    base_margin: float,
    *,
    growth_start: float,
    terminal_growth: float,
    target_margin: float,
    capex_to_rev: float,
    da_to_rev: float,
    nwc_to_rev: float,
    tax_rate: float,
    years: int = 5,
) -> list[ForecastYear]:
    growth = linear_path(growth_start, terminal_growth, years)
    # margin moves from the last actual toward the target, reaching it in the final year
    margins = [base_margin + (target_margin - base_margin) * (i + 1) / years for i in range(years)]
    out: list[ForecastYear] = []
    rev_prev = base_revenue
    for i in range(years):
        rev = rev_prev * (1 + growth[i])
        ebit = rev * margins[i]
        nopat = ebit * (1 - tax_rate)
        da, cx = rev * da_to_rev, rev * capex_to_rev
        dnwc = nwc_to_rev * (rev - rev_prev)
        out.append(
            ForecastYear(
                base_year + i + 1,
                growth[i],
                rev,
                margins[i],
                ebit,
                nopat,
                da,
                cx,
                dnwc,
                nopat + da - cx - dnwc,
            )
        )
        rev_prev = rev
    return out
