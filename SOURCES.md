# Data sources

| Input | Source | Access | Date |
|---|---|---|---|
| Annual 10-K financials | SEC EDGAR companyfacts XBRL API, `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` | Free, User-Agent required, rate-limited to 5 req/s | per snapshot `fetched_at` |
| Price, shares outstanding, beta | Yahoo Finance via `yfinance` | Free | per snapshot `fetched_at` |
| Risk-free rate | FRED series DGS10 (10-year US Treasury constant maturity), `https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10` | Free, no key | latest observation, recorded in `rates.json` |
| Equity risk premium | Aswath Damodaran, implied US ERP (trailing 12m cash yield) **4.23%** as of **1 Jan 2026**. [histimpl](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histimpl.html), [Data Update 2 for 2026](https://aswathdamodaran.blogspot.com/2026/01/data-update-2-for-2026-equities-get.html) | Free | 2026-01-01 |
