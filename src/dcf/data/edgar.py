"""SEC EDGAR companyfacts (XBRL) loader.

Extracts annual 10-K figures for the last N fiscal years, trying a list of us-gaap
tags per field and recording which tag supplied each value.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from . import http
from .sources import SEC_COMPANYFACTS_URL

# field -> ordered tag fallbacks. kind: "duration" (flow over the fiscal year) or "instant".
FIELDS: dict[str, dict[str, Any]] = {
    "revenue": {
        "kind": "duration",
        "tags": [
            "Revenues",
            "RevenueFromContractWithCustomerExcludingAssessedTax",
            "RevenueFromContractWithCustomerIncludingAssessedTax",
            "SalesRevenueNet",
        ],
    },
    "operating_income": {"kind": "duration", "tags": ["OperatingIncomeLoss"]},
    "pretax_income": {
        "kind": "duration",
        "tags": [
            "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
            "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments",
            "IncomeLossFromContinuingOperationsBeforeIncomeTaxesDomestic",
        ],
    },
    "tax_expense": {"kind": "duration", "tags": ["IncomeTaxExpenseBenefit"]},
    "d_and_a": {
        "kind": "duration",
        "tags": [
            "DepreciationDepletionAndAmortization",
            "DepreciationAmortizationAndAccretionNet",
            "DepreciationAndAmortization",
            "DepreciationAmortizationAndOther",
            "Depreciation",
        ],
    },
    "capex": {
        "kind": "duration",
        "tags": [
            "PaymentsToAcquirePropertyPlantAndEquipment",
            "PaymentsToAcquireProductiveAssets",
        ],
    },
    "interest_expense": {
        "kind": "duration",
        "tags": [
            "InterestExpense",
            "InterestExpenseNonoperating",
            "InterestExpenseDebt",
            "InterestAndDebtExpense",
            "InterestPaidNet",
        ],
    },
    "diluted_shares": {
        "kind": "duration",
        "unit": "shares",
        "tags": [
            "WeightedAverageNumberOfDilutedSharesOutstanding",
            "WeightedAverageNumberOfShareOutstandingBasicAndDiluted",
            # last resort (e.g. XOM reports basic only; its diluted EPS equals basic)
            "WeightedAverageNumberOfSharesOutstandingBasic",
        ],
    },
    "current_assets": {"kind": "instant", "tags": ["AssetsCurrent"]},
    "current_liabilities": {"kind": "instant", "tags": ["LiabilitiesCurrent"]},
    "cash": {
        "kind": "instant",
        "tags": [
            "CashAndCashEquivalentsAtCarryingValue",
            "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
            "Cash",
        ],
    },
    # Debt components; summed into total_debt.
    "debt_noncurrent": {
        "kind": "instant",
        "tags": [
            "LongTermDebtNoncurrent",
            "LongTermDebtAndCapitalLeaseObligations",
            "LongTermDebtAndFinanceLeaseObligationsNoncurrent",
        ],
    },
    "debt_current": {
        "kind": "instant",
        "tags": [
            "LongTermDebtCurrent",
            "LongTermDebtAndCapitalLeaseObligationsCurrent",
            "DebtCurrent",
        ],
    },
    "short_term_borrowings": {
        "kind": "instant",
        "tags": [
            "CommercialPaper",
            "ShortTermBorrowings",
            "OtherShortTermBorrowings",
        ],
    },
    # M3.5: liquid securities outside "cash" (MSFT, AAPL hold large balances) and
    # captive-finance receivables (CAT Financial). Optional; used by the model bridge.
    "short_term_investments": {
        "kind": "instant",
        "tags": ["ShortTermInvestments", "MarketableSecuritiesCurrent"],
    },
    "finance_receivables_current": {
        "kind": "instant",
        "tags": ["NotesAndLoansReceivableNetCurrent"],
    },
    "finance_receivables_noncurrent": {
        "kind": "instant",
        "tags": ["NotesAndLoansReceivableNetNoncurrent"],
    },
}

# Fields a downstream DCF needs; tests require these to be present for every year.
REQUIRED = [
    "revenue",
    "pretax_income",
    "tax_expense",
    "d_and_a",
    "capex",
    "current_assets",
    "current_liabilities",
    "cash",
    "total_debt",
    "diluted_shares",
]
ANNUAL_FORMS = {"10-K", "10-K/A", "10-KT"}


def fetch_companyfacts(cik: int) -> dict:
    return http.get(SEC_COMPANYFACTS_URL.format(cik=cik)).json()


def _days(start: str, end: str) -> int:
    return (date.fromisoformat(end) - date.fromisoformat(start)).days


def _annual_points(facts: dict, tag: str, kind: str, unit: str = "USD") -> dict[str, dict]:
    """Return {period_end: fact} for annual 10-K values of a tag (latest filing wins)."""
    node = facts.get("facts", {}).get("us-gaap", {}).get(tag)
    if not node:
        return {}
    out: dict[str, dict] = {}
    for f in node.get("units", {}).get(unit, []):
        if f.get("form") not in ANNUAL_FORMS:
            continue
        if kind == "duration":
            if "start" not in f or not 350 <= _days(f["start"], f["end"]) <= 380:
                continue
        elif "start" in f:
            continue
        prev = out.get(f["end"])
        if prev is None or f.get("filed", "") > prev.get("filed", ""):
            out[f["end"]] = f
    return out


def fiscal_year_of(end: str) -> int:
    """52/53-week years that end in the first days of January belong to the prior year."""
    d = date.fromisoformat(end)
    return d.year - 1 if d.month == 1 and d.day <= 10 else d.year


def fiscal_year_ends(facts: dict, n_years: int) -> list[str]:
    ends: set[str] = set()
    for tag in FIELDS["revenue"]["tags"]:
        ends |= set(_annual_points(facts, tag, "duration"))
    # Drop near-duplicate ends (52/53-week years can shift by a few days): keep one per year.
    by_year: dict[int, str] = {}
    for e in sorted(ends):
        by_year[fiscal_year_of(e)] = e
    return sorted(by_year.values())[-n_years:]


def _match(points: dict[str, dict], end: str) -> dict | None:
    if end in points:
        return points[end]
    target = date.fromisoformat(end)
    for e, f in points.items():
        if abs((date.fromisoformat(e) - target).days) <= 7:
            return f
    return None


def extract(facts: dict, ticker: str, n_years: int = 6) -> dict:
    """Extract per-year figures plus provenance (tag, accession, filed date)."""
    ends = fiscal_year_ends(facts, n_years)
    years: list[dict] = []
    cache: dict[tuple[str, str], dict[str, dict]] = {}
    for end in ends:
        row: dict[str, Any] = {"fiscal_year": fiscal_year_of(end), "period_end": end}
        prov: dict[str, dict] = {}
        for field, spec in FIELDS.items():
            row[field] = None
            for tag in spec["tags"]:
                key = (tag, spec["kind"])
                if key not in cache:
                    cache[key] = _annual_points(facts, tag, spec["kind"], spec.get("unit", "USD"))
                f = _match(cache[key], end)
                if f is not None:
                    row[field] = float(f["val"])
                    prov[field] = {"tag": tag, "accn": f.get("accn"), "filed": f.get("filed")}
                    break
        parts = [row[k] for k in ("debt_noncurrent", "debt_current", "short_term_borrowings")]
        row["total_debt"] = (
            float(sum(p for p in parts if p is not None))
            if any(p is not None for p in parts)
            else None
        )
        # EBIT fallback when OperatingIncomeLoss is not reported: pretax income + interest.
        if (
            row["operating_income"] is None
            and row["pretax_income"] is not None
            and row["interest_expense"] is not None
        ):
            row["operating_income"] = row["pretax_income"] + row["interest_expense"]
            prov["operating_income"] = {"tag": "derived:pretax_income+interest_expense"}
        row["sources"] = prov
        years.append(row)
    return {
        "ticker": ticker,
        "cik": facts.get("cik"),
        "entity_name": facts.get("entityName"),
        "years": years,
    }


def coverage(record: dict) -> dict:
    """Summarise years, gaps and fallback tags used for a ticker."""
    years = record["years"]
    gaps = {
        f"{y['fiscal_year']}:{k}"
        for y in years
        for k in [*REQUIRED, "operating_income", "interest_expense"]
        if y.get(k) is None
    }
    fallbacks: dict[str, set[str]] = {}
    for y in years:
        for field, p in y["sources"].items():
            tags = FIELDS.get(field, {}).get("tags", [])
            if not tags or p["tag"] != tags[0]:
                fallbacks.setdefault(field, set()).add(p["tag"])
    return {
        "ticker": record["ticker"],
        "fiscal_years": [y["fiscal_year"] for y in years],
        "gaps": sorted(gaps),
        "fallback_tags": {k: sorted(v) for k, v in sorted(fallbacks.items())},
    }
