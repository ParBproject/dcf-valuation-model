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

## Data layer (M1)

`make snapshot` pulls inputs for AAPL, MSFT, KO, JNJ, CAT and XOM and writes a dated
snapshot to `data/snapshots/<date>/`: one JSON per ticker (6 fiscal years of 10-K figures,
each value tagged with the us-gaap tag, accession number and filing date it came from),
`market.json`, `rates.json` and `manifest.json` (fetch times, sources, coverage).
Tests run fully offline against the committed snapshot. See [SOURCES.md](SOURCES.md).

Set `SEC_USER_AGENT` to identify yourself to SEC (e.g. `"Your Name you@example.com"`).

```
make install && make check     # ruff + pytest, offline
make snapshot                  # refresh inputs (network)
```

## CI

The intended workflow lives at [`ci/github-workflow-ci.yml`](ci/github-workflow-ci.yml).
It is **not active yet**: copy it to `.github/workflows/ci.yml` to enable it. Until then,
`make check` is run locally before each merge.

## License
MIT
