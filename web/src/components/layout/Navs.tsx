import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { NAV } from './nav'

/** Keep the shared query (ticker, scenario, overrides) when moving between pages. */
function useQuery() { return useLocation().search }

export function SideNav() {
  const q = useQuery()
  return (
    <nav aria-label="Primary" className="sticky top-8 hidden h-[calc(100vh-64px)] w-[208px] shrink-0 flex-col gap-0.5 border-r border-line p-2 lg:flex">
      {NAV.map((n) => (
        <NavLink key={n.to} to={{ pathname: n.to, search: q }} className={({ isActive }) => clsx(
          'flex h-5 items-center gap-1.5 rounded-control px-1.5 text-sm transition-colors focus-visible:shadow-focus',
          isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-white/5 hover:text-fg')}>
          {n.icon}{n.label}
        </NavLink>
      ))}
      <div className="mt-auto border-t border-line pt-2">
        <NavLink to={{ pathname: '/gallery', search: q }} className={({ isActive }) => clsx(
          'flex h-4 items-center rounded-control px-1.5 text-xs', isActive ? 'text-accent' : 'text-muted hover:text-fg')}>
          Design gallery
        </NavLink>
      </div>
    </nav>
  )
}

export function BottomTabs() {
  const q = useQuery()
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {NAV.filter((n) => n.mobile).map((n) => (
          <li key={n.to}>
            <NavLink to={{ pathname: n.to, search: q }} className={({ isActive }) => clsx(
              'flex h-7 flex-col items-center justify-center gap-0.5 text-[11px]',
              isActive ? 'text-accent' : 'text-muted')}>
              {n.icon}<span>{n.short}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
