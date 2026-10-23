"""Market data from yfinance: price, shares outstanding, beta."""

from __future__ import annotations

from datetime import datetime, timezone


def fetch_market(ticker: str) -> dict:
    import yfinance as yf

    t = yf.Ticker(ticker)
    info = t.info or {}
    hist = t.history(period="10d", auto_adjust=False)["Close"].dropna()
    last_close = float(hist.iloc[-1]) if len(hist) else None
    last_close_date = hist.index[-1].date().isoformat() if len(hist) else None
    price = info.get("currentPrice") or info.get("regularMarketPrice") or last_close
    return {
        "ticker": ticker,
        "price": float(price) if price is not None else None,
        "last_close": last_close,
        "last_close_date": last_close_date,
        "shares_outstanding": _f(info.get("sharesOutstanding")),
        "market_cap": _f(info.get("marketCap")),
        "beta": _f(info.get("beta")),
        "currency": info.get("currency"),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "yfinance (Yahoo Finance) Ticker.info / history",
    }


def _f(x) -> float | None:
    return float(x) if x is not None else None
