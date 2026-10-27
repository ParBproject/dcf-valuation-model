# Calibration

Snapshot: `data/snapshots/2026-10-22`. Model numbers below come from `scripts/run_valuations.py` and `scripts/run_calibration.py`, or from the results file of the earlier 5-year version of this model. External figures are cited with the date they were read. Nothing is tuned to market prices.

## Why the values sit below the market

The first version of the model, a 5-year explicit forecast that carried the last year's free cash flow into perpetuity, valued AAPL at $116.81 against a $348.22 price, MSFT at $200.76 against $521.08, and CAT at $233.89 against $704.05. Its reverse DCF put the growth implied by those prices at 33–45% a year for five years, and the Monte Carlo gave those three a 0% chance of value above price. A gap that large is either a modelling error or a choice that should be written down. This note separates the two.

The base prices in the 5-year column are still produced by `scripts/run_calibration.py` (step `m3`). The bull case, Monte Carlo probability and implied growth in that column are the figures from the results file committed with the 5-year model. They are not in the current `results/valuations.json`, and the scenario file has changed, so the script does not recompute them. Current base, bear, bull, Monte Carlo and reverse DCF are in `results/valuations.json`.

## Before and after

| Ticker | Market | 5y base | 5y bull | 5y P(value>price) | 5y implied growth | Base | Bear | Bull | P(value>price) | Implied growth (10y) | …margins held |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AAPL | $348.22 | $116.81 | $168.83 | 0.0% | 32.8% | $122.18 | $85.19 | $191.64 | 0.0% | 20.1% | 19.2% |
| MSFT | $521.08 | $200.76 | $288.45 | 0.0% | 42.1% | $311.52 | $214.18 | $501.64 | 1.1% | 15.8% | 15.0% |
| KO | $95.34 | $49.97 | $91.53 | 2.2% | 18.3% | $51.38 | $29.18 | $106.42 | 2.7% | 12.3% | 11.1% |
| JNJ | $267.61 | $216.55 | $376.02 | 18.9% | 7.1% | $182.75 | $116.02 | $438.04 | 7.4% | 7.4% | 3.4% |
| CAT | $704.05 | $233.89 | $362.42 | 0.0% | 45.4% | $279.82 | $197.71 | $411.05 | 0.0% | 20.3% | 19.7% |
| XOM | $178.23 | $242.42 | $453.28 | 82.4% | 1.0% | $216.26 | $126.64 | $472.38 | 71.9% | 5.6% | 3.0% |

Implied growth is the constant revenue growth over the explicit period at which the base case equals the market price. The earlier model used five years and this one uses ten, so the rates are not like-for-like: a 10-year rate compounds for twice as long. "Margins held" keeps the EBIT margin at the last reported level instead of reverting to the 6-year mean.

## What changed, in dollars per share

Each column adds one change to the previous column. Brackets are the step.

| Ticker | 5-year model | + ST investments as cash | + CAT finance netting | + terminal reinvest. g/ROIC | + 10-year horizon |
|---|---|---|---|---|---|
| AAPL | $116.81 | $119.51 (+2.70) | $119.51 (+0.00) | $103.08 (−16.43) | $122.18 (+19.09) |
| MSFT | $200.76 | $220.17 (+19.41) | $220.17 (+0.00) | $255.56 (+35.38) | $311.52 (+55.96) |
| KO | $49.97 | $50.07 (+0.10) | $50.07 (+0.00) | $43.63 (−6.44) | $51.38 (+7.75) |
| JNJ | $216.55 | $218.54 (+1.98) | $218.54 (+0.00) | $163.53 (−55.01) | $182.75 (+19.22) |
| CAT | $233.89 | $233.89 (+0.00) | $275.30 (+41.41) | $229.23 (−46.07) | $279.82 (+50.59) |
| XOM | $242.42 | $242.42 (+0.00) | $242.42 (+0.00) | $157.05 (−85.37) | $216.26 (+59.21) |

`results/calibration.json` is this table, unrounded. Regenerate it with `python scripts/run_calibration.py`.

### Errors fixed

1. **Terminal reinvestment did not match growth.** The 5-year model carried the final year's capex − D&A + ΔNWC into perpetuity. For AAPL and KO that reinvestment is near zero or negative, so the model assumed 2.5% growth for free and overstated value. For MSFT (capex 19% of revenue, D&A 7%) it assumed that capex forever and understated value. Terminal FCF is now NOPAT × (1 − g / ROIC), with ROIC 15% (`TERMINAL_ROIC`, overridable as `terminal_roic`). This step lowers AAPL, KO, JNJ, CAT and XOM and raises MSFT.
2. **Short-term investments were in working capital.** Cash was only `CashAndCashEquivalents`, so marketable securities (MSFT $55.9B, AAPL $18.8B; tags `ShortTermInvestments` / `MarketableSecuritiesCurrent`) sat in operating NWC. That inflated MSFT's NWC/revenue ratio (22.6%) and left the securities out of the equity bridge. They are now excluded from NWC and added to cash. Noncurrent marketable securities, which are large for AAPL, are still left out.
3. **Cat Financial debt was treated as operating debt.** CAT's $36.2B total debt includes captive-finance debt against $24.9B of finance receivables (`NotesAndLoansReceivableNetCurrent` $10.6B + `NotesAndLoansReceivableNetNoncurrent` $14.3B, FY2025 10-K). With `captive_finance: true` the model nets those receivables against debt (net debt claim $11.3B) and drops current finance receivables from NWC. It assumes captive debt is about equal to the receivables. CAT's value rises, and so does its WACC (10.40% to 11.14%) because the debt weight falls.

The extra balance-sheet fields were added to the existing snapshot by `scripts/add_supplement.py` from SEC companyfacts (fetched 2026-10-22, provenance on each value, `supplement_fetched_at`). No other snapshot value changed.

### Choices, not errors

- **Ten-year horizon.** A 5-year fade from 9–15% growth to 2.5% is abrupt for high-return businesses. The explicit period is 10 years, same linear fade.
- **Tax rate.** Six-year mean effective rate, clamped to 10–30% (AAPL 16.4%, MSFT 16.9%, CAT 22.5%). A 21% statutory rate would lower values further.
- **Share count.** yfinance shares outstanding on the snapshot date.
- **MSFT capex.** FY2026 capex was about 35% of revenue, against 12% in FY2021. The explicit period uses the 6-year average (18.9%), not the latest year. Terminal value no longer carries capex − D&A forward, so the spike only affects the 10 explicit years. A 1pp capex cut moves MSFT by under $5.
- **Margin reversion.** Holding margins at the last actual instead of the mean adds $7 (AAPL), $19 (MSFT) and $11 (CAT). Real, and small next to the gap.
- **Reverse DCF** still follows the reverting margin path, so it matches the base case, and also reports `implied_growth_margin_held`. The two are close for AAPL, MSFT and CAT, so margin reversion is not what drives their gap.

## The discount rate

| Ticker | Base | Margins held | ROIC 25% | ROIC = WACC | Capex −1pp | Exit-multiple TV | rf 4.18% + ERP 4.23% | Implied WACC | Base WACC |
|---|---|---|---|---|---|---|---|---|---|
| AAPL | $122.18 | $129.49 | $126.91 | $115.42 | $124.65 | $140.39 | $140.56 | 4.9% | 9.5% |
| MSFT | $311.52 | $330.51 | $326.04 | $290.34 | $316.23 | $377.66 | $364.55 | 6.8% | 9.5% |
| KO | $51.38 | $57.16 | $54.33 | $42.95 | $52.44 | $46.65 | $66.33 | 5.0% | 7.0% |
| JNJ | $182.75 | $249.49 | $190.92 | $159.05 | $185.88 | $181.12 | $226.26 | 5.4% | 6.9% |
| CAT | $279.82 | $290.50 | $288.83 | $272.00 | $292.22 | $388.71 | $311.47 | 5.8% | 11.1% |
| XOM | $216.26 | $266.26 | $226.00 | $187.04 | $225.46 | $212.68 | $269.26 | 7.9% | 6.8% |

Implied WACC is the discount rate at which the current base case equals the market price. For AAPL, MSFT and CAT that is 4.9%, 6.8% and 5.8%, against 9.5–11.1% in the model. AAPL's implied rate is below the 5.13% risk-free rate. Cash-flow tweaks in the table do not close the gap. It is the cost of capital (5.13% rf + Blume beta × 4.23% ERP) against the lower return the market is accepting, plus growth beyond what a mean-reverting model assumes.

**Risk-free rate and ERP.** Damodaran's 4.23% implied ERP at the start of 2026 was computed against a 4.18% Treasury yield (expected market return about 8.4%). The model pairs that ERP with the snapshot's 5.13% 10-year yield, which implies a market return of about 9.4%. If the expected market return had stayed put, the ERP would be lower. Using the January pair (rf 4.18%, ERP 4.23%) lifts values by 11–29% (column above). The base case keeps the snapshot yield. That is the main conservative choice.

## Scenarios (`config/scenarios.yaml`)

| | Bear | Base | Bull |
|---|---|---|---|
| Year-1 growth | base − 3pp | historical CAGR (capped 15%) | base + 3pp |
| Growth path | linear fade to g over 10 years | same | same |
| Long-run EBIT margin | 6-year mean − 2pp | 6-year mean | held at last reported |
| Capex / revenue | 6-year mean | 6-year mean | mean − 1pp |
| Terminal ROIC | 10% | 15% | 25% |
| WACC | base + 1pp | CAPM | base − 1pp |
| Terminal g | 2.0% | 2.5% | 3.0% |

The bull case is that fixed set. It was not fit to prices. It reaches about 96% of the market price for MSFT and exceeds it for KO, JNJ and XOM. It is 55% of the price for AAPL and 58% for CAT.

The earlier 5-year bull shifted year-1 growth by +3pp, the margin by +2pp, WACC by −1pp and terminal growth by +0.5pp. Capex and the terminal treatment were unchanged. Those bull prices are in the first table, not this one.

## Outside the model

**Damodaran implied ERP.** [histimpl](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histimpl.html), read 2026-10-22: start-of-2026 row, S&P 500 6845.50, T-bond rate 4.18%, implied ERP (FCFE) 4.23%. That matches `data/snapshots/2026-10-22/rates.json`. His company valuations for these six names were not pulled, so they are not cited.

**Analyst targets** are 12-month price targets from S&P Global via stockanalysis.com, read 2026-10-27. They are not intrinsic values, and they move. The model prices next to them are from the 2026-10-22 snapshot, so this is not a same-day comparison.

| Ticker | Snapshot price | Consensus target | Analysts | Model base | Model bull | Page |
|---|---:|---:|---:|---:|---:|---|
| AAPL | $348.22 | $330.02 | 44 | $122.18 | $191.64 | https://stockanalysis.com/stocks/aapl/forecast/ |
| MSFT | $521.08 | $605.12 | 57 | $311.52 | $501.64 | https://stockanalysis.com/stocks/msft/forecast/ |
| KO | $95.34 | $95.63 | 25 | $51.38 | $106.42 | https://stockanalysis.com/stocks/ko/forecast/ |
| JNJ | $267.61 | $279.41 | 23 | $182.75 | $438.04 | https://stockanalysis.com/stocks/jnj/forecast/ |
| CAT | $704.05 | $926.91 | 29 | $279.82 | $411.05 | https://stockanalysis.com/stocks/cat/forecast/ |
| XOM | $178.23 | $179.41 | 25 | $216.26 | $472.38 | https://stockanalysis.com/stocks/xom/forecast/ |

The same pages show consensus revenue growth of 14.8% (AAPL FY2026), 18.0% (MSFT FY2027) and 17.8% (CAT FY2026). The model's year-1 growth, the historical CAGR, is 8.7%, 14.6% and 10.1%. Near-term growth is below consensus for all three because the model does not take analyst inputs.

## Reading the gap

- Terminal reinvestment, short-term investments and Cat Financial debt were wrong and are fixed. With the 10-year horizon, AAPL moves from $116.81 to $122.18, MSFT from $200.76 to $311.52, and CAT from $233.89 to $279.82. Implied growth for those three falls from 33–45% over 5 years to about 16–20% over 10.
- Kept on purpose: the 5.13% risk-free rate with the 4.23% ERP, historical growth, mean-reverting margins, 15% terminal ROIC, and average capex.
- AAPL, MSFT and CAT are still well below the market. Their prices imply discount rates of 4.9–6.8%, or growth well above history. At these rates and these historical fundamentals, the prices need a lot to go right. That is not a claim that the stocks are mispriced, and it is not investment advice.
