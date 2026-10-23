# DCF Valuation Model

An honest, reproducible discounted-cash-flow (DCF) valuation model built from SEC EDGAR
filings. Every figure comes from real data or a real run; raw inputs are committed as
dated snapshots so results can be rebuilt offline.

**Status:** under construction, built milestone by milestone.

| Milestone | Scope |
|---|---|
| M1 | Data layer (SEC EDGAR, yfinance, FRED) and dated snapshots |
| M2+ | FCF projections, WACC, terminal value, sensitivity, Monte Carlo, React dashboard |

## Layout

```
src/dcf/data       loaders: SEC companyfacts, market data, rates
src/dcf/model      DCF math (M2)
src/dcf/analysis   sensitivity / Monte Carlo (later)
data/snapshots     dated raw-input snapshots
results            model outputs
web/               React + TypeScript dashboard (later)
```

## License
MIT
