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

## Beta (M3)

The snapshot includes `prices.json`: 5 years of monthly adjusted closes for each ticker and
the S&P 500 (^GSPC), fetched 2026-10-22, giving 59 monthly returns. The last month is partial.
The default beta is the **OLS regression beta against the S&P 500 with the Blume adjustment**
(0.67*raw + 0.33). Raw OLS betas are noisy, and low ones such as XOM's 0.17 or JNJ's 0.22
would set the cost of equity barely above the risk-free rate. The raw regression beta and the
yfinance beta are reported alongside it in `results/valuations.json`. Override per ticker with
`beta_method: regression_raw | yfinance` or a fixed `beta:` in `config/<TICKER>.yaml`.

## Analysis (M3)

`results/valuations.json` (schema 1.0.0) is the single file the dashboard reads. Per ticker it
holds the base case, bear/base/bull scenarios (`config/scenarios.yaml`), a WACC ±2pp × g 1–4%
grid, a tornado of driver shocks, a Monte Carlo summary and histogram, and a reverse DCF.

- **Monte Carlo:** 10,000 draws, seed 20261022. growth ~ N(base, 3pp), margin ~ N(base, 2pp),
  WACC ~ N(base, 1pp) floored at rf, g ~ Triangular(1%, base, 3.5%). Draws with g ≥ WACC − 0.5pp
  are rejected and redrawn.
- **Reverse DCF:** the constant 5-year revenue growth at which value equals the market price,
  with all other base assumptions held.

## CI

The intended workflow lives at [`ci/github-workflow-ci.yml`](ci/github-workflow-ci.yml).
It is **not active yet**: copy it to `.github/workflows/ci.yml` to enable it. Until then,
`make check` is run locally before each merge.

## License
MIT
