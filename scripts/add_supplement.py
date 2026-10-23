"""M3.5: add the optional balance-sheet fields (short-term investments, captive-finance
receivables) to the latest snapshot's EDGAR records without touching any other value.

Re-fetches SEC companyfacts, extracts only the new fields for the fiscal years already in
the snapshot, and records provenance plus a `supplement_fetched_at` timestamp.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from dcf.data import edgar, sources

ROOT = Path(__file__).resolve().parents[1]
NEW = ["short_term_investments", "finance_receivables_current", "finance_receivables_noncurrent"]

if __name__ == "__main__":
    snap = sorted(p for p in (ROOT / "data" / "snapshots").iterdir() if p.is_dir())[-1]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for tkr, cik in sources.TICKERS.items():
        path = snap / f"{tkr}.json"
        rec = json.loads(path.read_text())
        fresh = {
            y["period_end"]: y for y in edgar.extract(edgar.fetch_companyfacts(cik), tkr)["years"]
        }
        for y in rec["years"]:
            f = fresh.get(y["period_end"], {})
            for k in NEW:
                y[k] = f.get(k)
                if k in f.get("sources", {}):
                    y["sources"][k] = f["sources"][k]
        rec["supplement_fetched_at"] = now
        path.write_text(json.dumps(rec, indent=2) + "\n")
        print(tkr, [(y["fiscal_year"], *(y[k] for k in NEW)) for y in rec["years"]][-1])
