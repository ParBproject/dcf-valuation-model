import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Card } from '../components/ui/Card'
import { PageHeader } from './PageHeader'
import { ScrollX } from '../components/ui/ScrollX'
import { useValuations } from '../data/useValuations'

const F = ({ tex }: { tex: string }) => (
  <ScrollX label="Formula" className="py-1 text-fg">
    <div dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: true, throwOnError: false, output: 'htmlAndMathml' }) }} />
  </ScrollX>
)
const REPO = 'https://github.com/ParBproject/dcf-valuation-model/blob/main'

export function Methodology() {
  const { data } = useValuations()
  return (
    <>
      <PageHeader title="Methodology" sub="The same formulas run in Python (src/dcf) and in this page's TypeScript engine; parity is tested to 0.01%." />
      <div className="grid gap-2 xl:grid-cols-2">
        <Card title="Free cash flow">
          <F tex={String.raw`\text{FCFF}_t = \text{EBIT}_t(1-\tau) + \text{D\&A}_t - \text{Capex}_t - \Delta\text{NWC}_t`} />
          <p className="text-sm text-muted">τ is the average effective tax rate, clamped to 10–30%. NWC excludes cash, short-term investments and current debt.</p>
        </Card>
        <Card title="Forecast">
          <F tex={String.raw`g_t = g_1 + (g_\infty - g_1)\tfrac{t-1}{N-1},\qquad m_t = m_0 + (m^{*}-m_0)\tfrac{t}{N}`} />
          <p className="text-sm text-muted">Growth fades linearly to terminal g over N years (default 10). The margin reverts linearly to the target (historical mean).</p>
        </Card>
        <Card title="Discount rate">
          <F tex={String.raw`k_e = r_f + \beta\,\text{ERP},\quad \beta = 0.67\,\hat\beta_{\text{OLS}} + 0.33`} />
          <F tex={String.raw`\text{WACC} = \tfrac{E}{E+D}k_e + \tfrac{D}{E+D}k_d(1-\tau),\quad k_d = \min(\max(\tfrac{\text{interest}}{D}, r_f), 15\%)`} />
          <p className="text-sm text-muted">β̂ is from 59 monthly returns vs the S&amp;P 500. k_d falls back to r_f + 1% when interest is untagged.</p>
        </Card>
        <Card title="Terminal value">
          <F tex={String.raw`TV = \frac{\text{NOPAT}_N(1 - g/\text{ROIC})(1+g)}{\text{WACC} - g},\quad g < \text{WACC},\ g \le 4\%`} />
          <p className="text-sm text-muted">Reinvestment g/ROIC with ROIC = 15% by default. The exit EV/EBITDA multiple is reported as a cross-check only.</p>
        </Card>
        <Card title="Equity bridge">
          <F tex={String.raw`\text{Price} = \frac{\sum_{t=1}^{N}\frac{\text{FCFF}_t}{(1+\text{WACC})^t} + \frac{TV}{(1+\text{WACC})^N} - D + \text{Cash}}{\text{Shares}}`} />
          <p className="text-sm text-muted">Cash includes short-term investments. CAT nets Cat Financial receivables against debt.</p>
        </Card>
        <Card title="Monte Carlo and reverse DCF">
          <F tex={String.raw`g_1\sim\mathcal N(\hat g,3\text{pp}),\ m^*\sim\mathcal N(\hat m,2\text{pp}),\ \text{WACC}\sim\mathcal N(\hat w,1\text{pp}),\ g\sim\text{Tri}(1\%,\hat g_\infty,3.5\%)`} />
          <p className="text-sm text-muted">10,000 draws, rejecting g ≥ WACC − 0.5pp. The reverse DCF bisects for the constant growth at which value equals price.</p>
        </Card>
        <Card title="Sources" className="xl:col-span-2">
          <ul className="list-disc space-y-0.5 pl-2 text-sm text-muted">
            <li>SEC EDGAR companyfacts XBRL (10-K): every line item records its us-gaap tag, accession number and filing date.</li>
            <li>Yahoo Finance via yfinance: price, shares outstanding, 5 years of monthly closes for beta.</li>
            <li>FRED DGS10: 10-year Treasury yield{data && <> ({(data.rates.rf * 100).toFixed(2)}% on {data.rates.rf_date})</>}.</li>
            <li>Aswath Damodaran, implied US ERP 4.23% (1 Jan 2026), matched to a 4.18% T-bond rate.</li>
            <li>No 52-week price range is shown: the snapshot holds only month-end closes, so a true 52-week high/low isn't available.</li>
          </ul>
          <p className="mt-1 flex flex-wrap gap-2 text-sm">
            <a className="inline-flex min-h-[44px] items-center text-accent hover:text-accent-hover" href={`${REPO}/docs/calibration.md`}>Calibration review (docs/calibration.md)</a>
            <a className="inline-flex min-h-[44px] items-center text-accent hover:text-accent-hover" href={`${REPO}/SOURCES.md`}>SOURCES.md</a>
            <a className="inline-flex min-h-[44px] items-center text-accent hover:text-accent-hover" href={`${REPO}/docs/design.md`}>Design system</a>
          </p>
        </Card>
      </div>
    </>
  )
}
