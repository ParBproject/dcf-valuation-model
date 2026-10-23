import type { ReactNode } from 'react'

const I = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

export interface NavItem { to: string; label: string; short: string; icon: ReactNode; mobile: boolean }

export const NAV: NavItem[] = [
  { to: '/overview', label: 'Overview', short: 'Overview', icon: <I d="M3 12l9-8 9 8M5 10v10h14V10" />, mobile: true },
  { to: '/forecast', label: 'Forecast', short: 'Forecast', icon: <I d="M3 17l6-6 4 4 8-8M15 7h6v6" />, mobile: true },
  { to: '/sensitivity', label: 'Sensitivity', short: 'Sens.', icon: <I d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />, mobile: true },
  { to: '/monte-carlo', label: 'Monte Carlo', short: 'MC', icon: <I d="M4 20V10M9 20V4M14 20v-8M19 20v-5" />, mobile: true },
  { to: '/reverse-dcf', label: 'Reverse DCF', short: 'Reverse', icon: <I d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" />, mobile: true },
  { to: '/compare', label: 'Compare', short: 'Compare', icon: <I d="M8 3v18M16 3v18M3 8h5M16 16h5" />, mobile: false },
  { to: '/methodology', label: 'Methodology', short: 'Method', icon: <I d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2zM8 7h6" />, mobile: false },
]
