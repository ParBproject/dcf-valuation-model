"""Static inputs and their citations. Every constant here has a dated, public source."""

from __future__ import annotations

# Aswath Damodaran, implied US equity risk premium (trailing-12-month cash yield),
# computed on the S&P 500 at the start of January 2026 (index 6845.5, expected return
# 8.41%, less the 4.18% 10-year US Treasury rate).
DAMODARAN_ERP = 0.0423
DAMODARAN_ERP_AS_OF = "2026-01-01"
DAMODARAN_ERP_SOURCE = (
    "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histimpl.html ; "
    "https://aswathdamodaran.blogspot.com/2026/01/data-update-2-for-2026-equities-get.html"
)

SEC_COMPANYFACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"
FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}"

# Universe for the project; CIKs from SEC EDGAR company search.
TICKERS: dict[str, int] = {
    "AAPL": 320193,
    "MSFT": 789019,
    "KO": 21344,
    "JNJ": 200406,
    "CAT": 18230,
    "XOM": 34088,
}
