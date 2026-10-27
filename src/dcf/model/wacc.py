"""Cost of capital: CAPM cost of equity, after-tax cost of debt, market-value weights.

The default beta is a 5-year monthly regression against the S&P 500, then the Blume
adjustment. The snapshot stores those monthly closes and the yfinance beta.
"""

from __future__ import annotations

COST_OF_DEBT_FLOOR_SPREAD = 0.0  # pre-tax kd is never below rf
COST_OF_DEBT_CAP = 0.15


def cost_of_equity(rf: float, beta: float, erp: float) -> float:
    return rf + beta * erp


def regression_beta(stock_returns: list[float], market_returns: list[float]) -> float:
    if len(stock_returns) != len(market_returns) or len(stock_returns) < 24:
        raise ValueError("need >= 24 paired monthly returns")
    n = len(stock_returns)
    ms, mm = sum(stock_returns) / n, sum(market_returns) / n
    cov = sum((s - ms) * (m - mm) for s, m in zip(stock_returns, market_returns, strict=True))
    var = sum((m - mm) ** 2 for m in market_returns)
    return cov / var


def pretax_cost_of_debt(
    interest: float | None, debt: float, rf: float, fallback_spread: float = 0.01
) -> tuple[float, str]:
    """interest / debt, bounded to [rf, cap]; rf + spread when interest is missing."""
    if interest is None or interest <= 0 or debt <= 0:
        return rf + fallback_spread, "fallback:rf+spread"
    kd = interest / debt
    return min(max(kd, rf + COST_OF_DEBT_FLOOR_SPREAD), COST_OF_DEBT_CAP), "interest/debt"


def wacc(
    equity_value: float, debt_value: float, ke: float, kd_pretax: float, tax_rate: float
) -> float:
    v = equity_value + debt_value
    return equity_value / v * ke + debt_value / v * kd_pretax * (1 - tax_rate)


def blume(beta: float) -> float:
    """Blume (1971) adjustment toward 1: 0.67 * raw + 0.33."""
    return 0.67 * beta + 0.33
