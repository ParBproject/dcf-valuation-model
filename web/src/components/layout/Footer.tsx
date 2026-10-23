import { useValuations } from '../../data/useValuations'

export function Footer() {
  const { data } = useValuations()
  return (
    <footer className="mt-6 border-t border-line pt-3 text-xs leading-relaxed text-muted">
      <p>
        Data: SEC EDGAR companyfacts (10-K XBRL), Yahoo Finance via yfinance (prices, beta inputs),
        FRED DGS10 (risk-free rate), Damodaran implied ERP{data ? ` (${(data.rates.erp.value * 100).toFixed(2)}%, ${data.rates.erp.as_of})` : ''}.
        {' '}Snapshot <span className="num text-fg">{data?.snapshot_date ?? '…'}</span>
        {data && <> · schema <span className="num">{data.schema_version}</span></>}. Not investment advice.
      </p>
      <p className="mt-1 flex flex-wrap gap-x-2">
        <a className="inline-flex min-h-[44px] items-center text-accent hover:text-accent-hover" href="https://github.com/ParBproject/dcf-valuation-model">Source on GitHub</a>
        <a className="inline-flex min-h-[44px] items-center text-accent hover:text-accent-hover" href="https://parbproject.github.io/">Portfolio · parbproject.github.io</a>
      </p>
    </footer>
  )
}
