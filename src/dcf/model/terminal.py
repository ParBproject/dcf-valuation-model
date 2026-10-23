"""Terminal value: Gordon growth (primary) and an exit EV/EBITDA multiple (cross-check)."""

from __future__ import annotations

G_CAP = 0.04  # long-run nominal growth cap (roughly nominal GDP)


class TerminalGrowthError(ValueError):
    pass


def gordon(fcf_final: float, wacc: float, g: float, g_cap: float = G_CAP) -> float:
    if g > g_cap:
        raise TerminalGrowthError(f"g={g:.4f} exceeds cap {g_cap:.4f}")
    if g >= wacc:
        raise TerminalGrowthError(f"g={g:.4f} must be below WACC={wacc:.4f}")
    return fcf_final * (1 + g) / (wacc - g)


def exit_multiple(ebitda_final: float, multiple: float) -> float:
    return ebitda_final * multiple


def implied_multiple(tv: float, ebitda_final: float) -> float:
    return tv / ebitda_final
