# DCF Valuation Model

An honest, reproducible discounted-cash-flow (DCF) valuation model built from SEC EDGAR
filings. Every figure comes from real data or a real run; raw inputs are committed as
dated snapshots so results can be rebuilt offline.

**Status:** under construction, built milestone by milestone.

| Milestone | Scope |
|---|---|
| M1 | Data layer (SEC EDGAR, yfinance, FRED) and dated snapshots |
| M2–M3.5 | FCF projections, WACC, analysis, calibration review |
| M4+ | React + TypeScript dashboard |

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

`results/valuations.json` (schema 1.1.0) is the single file the dashboard reads. Per ticker it
holds the base case, bear/base/bull scenarios (`config/scenarios.yaml`), a WACC ±2pp × g 1–4%
grid, a tornado of driver shocks, a Monte Carlo summary and histogram, and a reverse DCF.

- **Monte Carlo:** 10,000 draws, seed 20261022. growth ~ N(base, 3pp), margin ~ N(base, 2pp),
  WACC ~ N(base, 1pp) floored at rf, g ~ Triangular(1%, base, 3.5%). Draws with g ≥ WACC − 0.5pp
  are rejected and redrawn.
- **Reverse DCF:** the constant revenue growth over the 10-year explicit period at which value
  equals the market price, reported twice: with margins reverting as in the base case, and
  with margins held at the last actual (`implied_growth_margin_held`).

## Calibration review (M3.5)

M3 valued AAPL, MSFT and CAT at roughly a third of their market prices. M3.5 audited why; the
full write-up with before/after tables, a step-by-step gap decomposition and dated benchmarks is
in [docs/calibration.md](docs/calibration.md), and the decomposition is reproducible in
`results/calibration.json` (`python scripts/run_calibration.py`). In short:

- **Errors fixed:** the terminal value carried explicit-period capex − D&A − ΔNWC into
  perpetuity (now reinvestment = g / ROIC, ROIC 15%); short-term investments (e.g. MSFT's
  $55.9B) sat in working capital instead of cash; Cat Financial's receivable-backed debt was
  subtracted as if it were operating debt (now netted against finance receivables).
- **Deliberate choices kept:** a 5.13% risk-free rate with Damodaran's 4.23% ERP, margins
  reverting to the 6-year mean, growth fading to 2.5%, and the 6-year average capex ratio.
- **Bull case** is a fixed, documented set (higher early growth, margins held, 1pp less
  capex, ROIC 25%, WACC −1pp, g +0.5pp), not tuned to prices. It reaches about 96% of the market price for MSFT, exceeds it for
  KO and JNJ, and still falls well short for AAPL (55%) and CAT (58%). Against base WACCs of 9.5–11.1%,
  the market prices of AAPL, MSFT and CAT imply base-case discount rates of about 4.9%, 6.8%
  and 5.8%.

The values are a modelling exercise, not investment advice or buy/sell calls.

## Web app (M4)

`web/` is a Vite + React + TypeScript (strict) app with Tailwind, Radix UI, Framer Motion and
Zustand. Design tokens and rules are in [docs/design.md](docs/design.md). The app reads
`web/public/data/valuations.json`, which `npm run sync-data` copies from `results/`; it is
generated, git-ignored and never hand-edited.

```
cd web && npm ci
npm test            # vitest (store + URL sync)
npm run build       # sync data, typecheck, build (base /dcf-valuation-model/)
npm run shots       # Playwright screenshots + 390px overflow check
```

## Live engine (M5)

`web/src/engine/` is a TypeScript port of the Python model: the 10-year fade, margin
reversion, terminal reinvestment g/ROIC, CAPM with the Blume beta, the cost-of-debt floor
and fallback, CAT receivables netting, the EV-to-equity bridge, Gordon growth with the
exit-multiple cross-check, and the reverse-DCF solver. Its inputs are
`tickers[T].engine` in `results/valuations.json` (schema 1.2.0, additive).

- **Parity gate:** `scripts/export_engine_fixtures.py` writes
  `web/src/engine/__fixtures__/parity.json` with base, bear, bull and 5 perturbed sets per
  ticker (including the Damodaran rf pairing). Vitest requires agreement within 0.01%.
- **Monte Carlo** runs in a Web Worker with the same distributions and a seeded PRNG
  (mulberry32 + Box-Muller). The PRNG differs from NumPy, so the match is statistical. Tolerance
  vs Python at 10k draws: P50 ±2%, P25/P75 ±3%, P5/P95 ±5%, P(value>price) ±2pp.
- **Assumptions panel:** a right column on desktop and a slide-up sheet on mobile. It has
  sliders plus numeric inputs, per-field and global reset, diff badges, and the rf/ERP pairing
  toggle. All state is in the URL, e.g. `#/overview?t=KO&s=bull&p=damodaran&beta=0.9`.

Regenerate after any model change: `make valuations && python scripts/export_engine_fixtures.py`, then `cd web && npm test && npm run e2e`.

## CI

The intended workflow lives at [`ci/github-workflow-ci.yml`](ci/github-workflow-ci.yml).
It is **not active yet**: copy it to `.github/workflows/ci.yml` to enable it. Until then,
`make check` is run locally before each merge.

## License
MIT
