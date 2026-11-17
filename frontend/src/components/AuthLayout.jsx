import { useId, useState } from 'react';

// Change this to your app's name
export const BRAND = 'Mz Fintech';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-emerald-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">{BRAND}</span>
        </div>

        <div className="relative">
          {/* Decorative card */}
          <div className="mb-12 w-80 -rotate-6 rounded-3xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-700 p-6 shadow-2xl shadow-emerald-950/60">
            <div className="flex items-start justify-between">
              <div className="h-8 w-11 rounded-md bg-emerald-950/25" />
              <span className="text-sm font-semibold text-emerald-950/70">{BRAND}</span>
            </div>
            <p className="mt-10 font-mono text-lg tracking-widest text-emerald-950/80">
              •••• •••• •••• 4821
            </p>
            <p className="mt-2 text-xs text-emerald-950/60">Valid thru 09/29</p>
          </div>

          <h2 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">
            Money that moves when you do.
          </h2>
          <p className="mt-4 max-w-sm text-emerald-100/70">
            Send, save and pay from one simple place.
          </p>
        </div>

        <p className="relative text-sm text-emerald-100/50">
          © {new Date().getFullYear()} {BRAND}
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Logo dark />
            <span className="text-lg font-semibold tracking-tight text-slate-900">{BRAND}</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <p className="mt-8 text-center text-sm text-slate-500">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

function Logo({ dark = false }) {
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
        dark ? 'bg-emerald-800 text-white' : 'bg-emerald-400 text-emerald-950'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 19V9l7-5 7 5v10" />
        <path d="M9 19v-6h6v6" />
      </svg>
    </span>
  );
}

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export const inputClass =
  'block h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:opacity-60';

export function Field({ label, hint, type = 'text', className = '', inputClassName = '', ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          className={`${inputClass} ${isPassword ? 'pr-12' : ''} ${inputClassName}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:text-emerald-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {show ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 6.1A9.8 9.8 0 0112 6c5 0 8.5 4 9.5 6a14 14 0 01-2.6 3.4M6.6 6.7A14 14 0 002.5 12c1 2 4.5 6 9.5 6 1.5 0 2.8-.4 4-.9" />
                  <path d="M9.9 9.9a3 3 0 004.2 4.2" />
                </>
              ) : (
                <>
                  <path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function SubmitButton({ busy, children, busyText, disabled, type = 'submit', ...props }) {
  return (
    <button
      type={type}
      disabled={busy || disabled}
      {...props}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 text-base font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {busy ? busyText : children}
    </button>
  );
}