"""Monthly adjusted closes (yfinance) for beta regression; stored in the snapshot."""

from __future__ import annotations

from datetime import datetime, timezone

BENCHMARK = "^GSPC"


def fetch_monthly(tickers: list[str], period: str = "5y") -> dict:
    import yfinance as yf

    syms = [*tickers, BENCHMARK]
    df = yf.download(syms, period=period, interval="1mo", auto_adjust=True, progress=False)
    close = df["Close"].dropna(how="any")
    return {
        "benchmark": BENCHMARK,
        "interval": "1mo",
        "period": period,
        "adjusted": True,
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "yfinance download (Yahoo Finance), auto_adjust=True",
        "dates": [d.date().isoformat() for d in close.index],
        "close": {s: [round(float(x), 6) for x in close[s]] for s in syms},
    }


def monthly_returns(closes: list[float]) -> list[float]:
    return [b / a - 1 for a, b in zip(closes, closes[1:], strict=False)]
