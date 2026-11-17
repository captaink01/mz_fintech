import { Link, NavLink } from 'react-router-dom';
import { BRAND } from './AuthLayout';

/* ── Icons ─────────────────────────────────────────── */
export function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
export const HomeIcon = (p) => <Icon {...p}><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></Icon>;
export const SendIcon = (p) => <Icon {...p}><path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4 18-7z" /></Icon>;
export const ListIcon = (p) => <Icon {...p}><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></Icon>;
export const ArrowUpIcon = (p) => <Icon {...p}><path d="M7 17L17 7" /><path d="M8 7h9v9" /></Icon>;
export const ArrowDownIcon = (p) => <Icon {...p}><path d="M17 7L7 17" /><path d="M16 17H7V8" /></Icon>;
export const ChevronLeftIcon = (p) => <Icon {...p}><path d="M15 18l-6-6 6-6" /></Icon>;
export const ChevronDownIcon = (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const RefreshIcon = (p) => <Icon {...p}><path d="M20 11a8 8 0 00-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0014.5 4.5L20 16" /><path d="M20 20v-4h-4" /></Icon>;
export const CheckIcon = (p) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>;

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ── Building blocks ───────────────────────────────── */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
      <Spinner className="h-6 w-6 text-emerald-700" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>
  );
}

export function StatusBadge({ status }) {
  const tone =
    status === 'SUCCESS'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'PENDING'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {String(status).toLowerCase()}
    </span>
  );
}

export function PageHeader({ title, back, action }) {
  return (
    <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
      <div>
        {back && (
          <Link
            to={back}
            aria-label="Back"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <ChevronLeftIcon />
          </Link>
        )}
      </div>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

/* ── Shell: top nav on desktop, bottom tab bar on mobile ── */
const NAV = [
  { to: '/dashboard', label: 'Home', Icon: HomeIcon },
  { to: '/transfer', label: 'Send', Icon: SendIcon },
  { to: '/history', label: 'History', Icon: ListIcon },
];

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-28 md:pb-12">
      {/* Desktop top bar */}
      <header className="hidden border-b border-slate-200 bg-white md:block">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight text-slate-900">
            {BRAND}
          </Link>
          <nav className="flex gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6 md:pt-10">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ to, label, Icon: NavIcon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                  isActive ? 'text-emerald-800' : 'text-slate-500'
                }`
              }
            >
              <NavIcon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}