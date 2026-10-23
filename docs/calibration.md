# Calibration review (M3.5)

Snapshot: `data/snapshots/2026-10-22`. Every number below comes from a real run of the code in
this repo (`scripts/run_valuations.py`, `scripts/run_calibration.py`) or from a page that was
actually fetched on the access date given. Nothing is hand-entered or tuned to market prices.

## Why this review

M3 valued AAPL at $116.81 vs a $348.22 market price, MSFT at $200.76 vs $521.08 and CAT at
$233.89 vs $704.05. Its reverse DCF said the market implied 33–45% revenue growth a year for
five years, and the Monte Carlo gave a 0% chance of value above price. A gap that large is
either a modelling error or a deliberate, defensible assumption, and a reviewer needs to be
able to tell which. This document separates the two.

## Before / after

| Ticker | Market | M3 base | M3 bull | M3 P(value>price) | M3 implied growth (5y) | M3.5 base | M3.5 bear | M3.5 bull | M3.5 P(value>price) | M3.5 implied growth (10y) | …margins held |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AAPL | $348.22 | $116.81 | $168.83 | 0.0% | 32.8% | $122.18 | $85.19 | $191.64 | 0.0% | 20.1% | 19.2% |
| MSFT | $521.08 | $200.76 | $288.45 | 0.0% | 42.1% | $311.52 | $214.18 | $501.64 | 1.1% | 15.8% | 15.0% |
| KO | $95.34 | $49.97 | $91.53 | 2.2% | 18.3% | $51.38 | $29.18 | $106.42 | 2.7% | 12.3% | 11.1% |
| JNJ | $267.61 | $216.55 | $376.02 | 18.9% | 7.1% | $182.75 | $116.02 | $438.04 | 7.4% | 7.4% | 3.4% |
| CAT | $704.05 | $233.89 | $362.42 | 0.0% | 45.4% | $279.82 | $197.71 | $411.05 | 0.0% | 20.3% | 19.7% |
| XOM | $178.23 | $242.42 | $453.28 | 82.4% | 1.0% | $216.26 | $126.64 | $472.38 | 71.9% | 5.6% | 3.0% |

"Implied growth" is the constant revenue growth over the explicit period at which the base
case equals the market price. M3 used a 5-year period; M3.5 uses 10 years, so the figures are
not like-for-like: a 10-year rate compounds over twice as many years. "Margins held" keeps the
EBIT margin at the last reported level instead of letting it revert to the 6-year mean.

## Gap decomposition (base case, $/share)

Each column adds one change to the previous column. Brackets show the step change.

| Ticker | M3 | + ST investments as cash | + CAT Financial netting | + terminal reinvest. g/ROIC | + 10-year horizon (M3.5) |
|---|---|---|---|---|---|
| AAPL | $116.81 | $119.51 (+2.70) | $119.51 (+0.00) | $103.08 (-16.43) | $122.18 (+19.09) |
| MSFT | $200.76 | $220.17 (+19.41) | $220.17 (+0.00) | $255.56 (+35.38) | $311.52 (+55.96) |
| KO | $49.97 | $50.07 (+0.10) | $50.07 (+0.00) | $43.63 (-6.44) | $51.38 (+7.75) |
| JNJ | $216.55 | $218.54 (+1.98) | $218.54 (+0.00) | $163.53 (-55.01) | $182.75 (+19.22) |
| CAT | $233.89 | $233.89 (+0.00) | $275.30 (+41.41) | $229.23 (-46.07) | $279.82 (+50.59) |
| XOM | $242.42 | $242.42 (+0.00) | $242.42 (+0.00) | $157.05 (-85.37) | $216.26 (+59.21) |

### Errors found and fixed

1. **Terminal reinvestment was inconsistent with growth (error).** M3 carried the final
   explicit year's `capex − D&A + ΔNWC` into perpetuity. For AAPL and KO that reinvestment is
   close to zero or negative (capex ≈ D&A, negative working capital), so the model assumed
   2.5% perpetual growth for free, which *overstated* value. For MSFT (capex 19% of revenue vs
   D&A 7%) it assumed AI-build-out capex forever, which *understated* value. The terminal FCF
   is now `NOPAT × (1 − g / ROIC)`, the value-driver formula, with a terminal return on new
   capital of 15% (`TERMINAL_ROIC`, overridable per ticker as `terminal_roic`). This step lowers
   AAPL, KO, JNJ, CAT and XOM and raises MSFT.
2. **Short-term investments were treated as working capital (error).** "Cash" was only the
   `CashAndCashEquivalents` tag, so marketable securities (MSFT $55.9B, AAPL $18.8B at the last
   balance sheet; tags `ShortTermInvestments` / `MarketableSecuritiesCurrent`) sat inside
   operating NWC. That inflated MSFT's NWC/revenue ratio (22.6%) and so its forecast working-
   capital drain, and left the securities out of the equity bridge. They are now excluded from
   NWC and added to cash. Noncurrent marketable securities (large for AAPL) are still not added;
   that is a known conservative omission.
3. **Cat Financial debt was treated as operating debt (error).** CAT's $36.2B total debt
   includes captive-finance debt that funds $24.9B of finance receivables
   (`NotesAndLoansReceivableNetCurrent` $10.6B + `NotesAndLoansReceivableNetNoncurrent` $14.3B,
   FY2025 10-K). With `captive_finance: true` the model nets these receivables against debt
   (net debt claim $11.3B) and excludes current finance receivables from NWC. This is an
   approximation (it assumes captive debt ≈ the receivables it funds). It raises CAT's value,
   but also its WACC (10.40% → 11.14%) because the debt weight falls.
4. **Five-year horizon too short for compounders (modelling choice, changed).** A 5-year fade
   from 9–15% growth straight to 2.5% is abrupt for high-return businesses. The explicit period
   is now 10 years with the same linear fade to g; this is the standard Damodaran-style setup.
5. **Reverse DCF held margins on the reverting path.** It still does by default (so it is
   consistent with the base case), but now also reports `implied_growth_margin_held`. The
   difference is small for AAPL, MSFT and CAT, so margin reversion is *not* what drives their
   gap.

Supporting data: the new balance-sheet fields were added to the existing snapshot by
`scripts/add_supplement.py` from SEC companyfacts (fetched 2026-10-22, provenance per value in
each ticker's JSON, `supplement_fetched_at`). No other snapshot value changed.

### Checked and not an error

- **Tax rate:** 6-year mean effective rate, clamped to 10–30% (AAPL 16.4%, MSFT 16.9%, CAT
  22.5%). Reasonable; using a 21% statutory rate would lower values further.
- **Share count:** yfinance shares outstanding at the snapshot date; consistent with the price.
- **Capex outlier (MSFT FY2026 at 34.9% of revenue):** the explicit period uses the 6-year
  average (18.9%), not the latest year. This is a deliberate middle ground; since the terminal
  value no longer carries capex − D&A forward, the outlier only affects the 10 explicit years.
  A 1pp capex cut moves MSFT by under $5.
- **Margin reversion:** holding margins at the last actual instead of reverting to the mean adds
  $7 (AAPL), $19 (MSFT) and $11 (CAT): real, but small relative to the gap.

## What still drives the gap: the discount rate

| Ticker | M3.5 base | Margins held at last | ROIC 25% | ROIC = WACC | Capex −1pp | Exit-multiple TV | rf 4.18% (Jan-26) + ERP 4.23% | Implied WACC | Base WACC |
|---|---|---|---|---|---|---|---|---|---|
| AAPL | $122.18 | $129.49 | $126.91 | $115.42 | $124.65 | $140.39 | $140.56 | 4.9% | 9.5% |
| MSFT | $311.52 | $330.51 | $326.04 | $290.34 | $316.23 | $377.66 | $364.55 | 6.8% | 9.5% |
| KO | $51.38 | $57.16 | $54.33 | $42.95 | $52.44 | $46.65 | $66.33 | 5.0% | 7.0% |
| JNJ | $182.75 | $249.49 | $190.92 | $159.05 | $185.88 | $181.12 | $226.26 | 5.4% | 6.9% |
| CAT | $279.82 | $290.50 | $288.83 | $272.00 | $292.22 | $388.71 | $311.47 | 5.8% | 11.1% |
| XOM | $216.26 | $266.26 | $226.00 | $187.04 | $225.46 | $212.68 | $269.26 | 7.9% | 6.8% |

"Implied WACC" is the discount rate at which the M3.5 base case equals the market price, all
else equal. For AAPL, MSFT and CAT the market price implies 4.9%, 6.8% and 5.8%, against
9.5–11.1% in the model. That is below the 5.13% risk-free rate for AAPL. No defensible
cash-flow tweak closes that: the remaining gap reflects the model's cost of capital
(5.13% rf + Blume beta × 4.23% ERP) versus the much lower return the market is currently
accepting on these stocks, plus growth expectations beyond what a mean-reverting model assumes.

**rf/ERP combination (deliberate choice, flagged).** Damodaran's 4.23% implied ERP for the start
of 2026 was computed against a 4.18% T-bond rate (expected market return ≈ 8.4%). The model
pairs it with the snapshot's 5.13% 10-year yield, which implies a ≈ 9.4% market return. If the
expected market return had stayed put, the ERP would be lower today. Using the January pairing
(rf 4.18%, ERP 4.23%) lifts values by 11–29% (column above) but would mix a stale rate into a
dated snapshot, so the base case keeps the current yield. This is the single most important
conservative choice in the model.

## Scenario definitions (`config/scenarios.yaml`)

| | Bear | Base | Bull |
|---|---|---|---|
| Year-1 growth | base − 3pp | historical CAGR (capped 15%) | base + 3pp |
| Growth path | linear fade to g over 10 years | same | same |
| Long-run EBIT margin | 6-year mean − 2pp | 6-year mean | held at last reported |
| Capex / revenue | 6-year mean | 6-year mean | mean − 1pp |
| Terminal ROIC | 10% | 15% | 25% |
| WACC | base + 1pp | CAPM | base − 1pp |
| Terminal g | 2.0% | 2.5% | 3.0% |

The bull case is a fixed, documented set and was not tuned to reach any price. Result: it
reaches about 96% of the market price for MSFT and exceeds it for KO, JNJ and XOM, but only
55% for AAPL and 58% for CAT.

## Benchmarks (fetched 2026-10-22)

**Damodaran implied ERP.** https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histimpl.html
(accessed 2026-10-22): start-of-2026 row shows S&P 500 6845.50, T-bond rate 4.18%, implied ERP
(FCFE) 4.23%, which matches the ERP in `data/snapshots/2026-10-22/rates.json`. Damodaran's
company-level valuations of these six firms were not fetched, so none are cited.

**Analyst consensus 12-month price targets** (S&P Global data via stockanalysis.com, each page
accessed 2026-10-22):

| Ticker | Market (Oct 22 close) | Consensus avg. 12-month target | Analysts | Page "last updated" | M3.5 base | M3.5 bull | URL |
|---|---|---|---|---|---|---|---|
| AAPL | $348.22 | $329.38 | 44 | Oct 21, 2026 | $122.18 | $191.64 | https://stockanalysis.com/stocks/aapl/forecast/ |
| MSFT | $521.08 | $599.24 | 56 | Oct 20, 2026 | $311.52 | $501.64 | https://stockanalysis.com/stocks/msft/forecast/ |
| KO | $95.34 | $94.74 | 24 | Oct 19, 2026 | $51.38 | $106.42 | https://stockanalysis.com/stocks/ko/forecast/ |
| JNJ | $267.61 | $279.41 | 23 | Oct 21, 2026 | $182.75 | $438.04 | https://stockanalysis.com/stocks/jnj/forecast/ |
| CAT | $704.05 | $951.11 | 28 | Oct 22, 2026 | $279.82 | $411.05 | https://stockanalysis.com/stocks/cat/forecast/ |
| XOM | $178.23 | $175.41 | 25 | Oct 22, 2026 | $216.26 | $472.38 | https://stockanalysis.com/stocks/xom/forecast/ |

Consensus targets are 12-month price targets, not intrinsic values, and are anchored to the
current price. They are useful as a sanity check, not as a calibration target. The same pages
show consensus revenue growth for the current fiscal year of 14.9% (AAPL FY2026), 17.9%
(MSFT FY2027) and 17.8% (CAT 2026), versus the model's year-1 growth (historical CAGR) of 8.7%,
14.6% and 10.1%. The model's near-term growth is below consensus for all three, which is part of
the gap and a deliberate choice (historical data only, no analyst inputs).

## Conclusion

- **Errors (fixed):** terminal reinvestment inconsistent with g; short-term investments inside
  NWC and outside cash; Cat Financial debt treated as operating debt. Together with the 10-year
  horizon these move AAPL $116.81 → $122.18, MSFT $200.76 → $311.52, CAT $233.89 → $279.82, and the
  implied growth for those three falls from 33–45% (5y) to about 16–20% (10y).
- **Conservative choices (kept, documented):** the 5.13% rf with the 4.23% ERP, historical
  (not consensus) growth, mean-reverting margins, 15% terminal ROIC and average capex.
- **Honest reading:** the model still values AAPL, MSFT and CAT well below market. Their prices
  imply discount rates of 4.9–6.8%, or sustained growth well above history. The model says
  "at today's rates and historical fundamentals these prices need a lot to go right", not "these
  stocks are mispriced". Nothing here is investment advice.
