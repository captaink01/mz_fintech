import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDate } from '../lib/format';
import AppShell, {
  Card,
  PageLoader,
  StatusBadge,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshIcon,
  SendIcon,
  ListIcon,
} from '../components/AppShell';
import { ErrorBanner } from '../components/AuthLayout';

export default function Dashboard() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setError('');
    try {
      const [acctRes, txRes] = await Promise.all([
        api.get('/accounts/me'),
        api.get('/transfers', { params: { limit: 5 } }),
      ]);
      setAccount(acctRes.data.account);
      setTransactions(txRes.data.transactions || []);
    } catch (err) {
      if (err.response?.status === 404) {
        // No account yet — bounce to onboarding
        navigate('/onboarding', { replace: true });
        return;
      }
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBalance = async () => {
    setRefreshingBalance(true);
    try {
      const { data } = await api.get('/accounts/balance');
      setAccount((prev) => ({ ...prev, balance: data.balance }));
    } catch (err) {
      setError(err.response?.data?.message || 'Balance refresh failed');
    } finally {
      setRefreshingBalance(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading your account…" />;
  }

  const initials = `${customer?.firstName?.[0] ?? ''}${customer?.lastName?.[0] ?? ''}`;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold uppercase text-emerald-800">
              {initials}
            </span>
            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <h1 className="text-lg font-semibold leading-tight text-slate-900">
                {customer?.firstName} {customer?.lastName}
              </h1>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20"
          >
            Log out
          </button>
        </div>

        <ErrorBanner>{error}</ErrorBanner>

        {/* Balance card */}
        {account && (
          <>
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white shadow-lg shadow-emerald-900/20">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/15 blur-2xl" />

              <div className="relative flex items-start justify-between">
                <p className="text-sm text-emerald-100/70">Available balance</p>
                <button
                  onClick={refreshBalance}
                  disabled={refreshingBalance}
                  aria-label="Refresh balance"
                  className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-full text-emerald-100/80 hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20 disabled:opacity-60"
                >
                  <RefreshIcon className={`h-5 w-5 ${refreshingBalance ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <p className="relative mt-1 text-4xl font-semibold tracking-tight">
                {formatNaira(account.balance)}
              </p>

              <div className="relative mt-8 border-t border-white/10 pt-4">
                <p className="font-mono text-base tracking-wider">{account.accountNumber}</p>
                <p className="mt-0.5 text-sm text-emerald-100/70">{account.accountName}</p>
              </div>
            </section>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/transfer"
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-800 text-base font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30"
              >
                <SendIcon />
                Send money
              </Link>
              <Link
                to="/history"
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-base font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20"
              >
                <ListIcon />
                History
              </Link>
            </div>
          </>
        )}

        {/* Recent transactions */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent transactions</h2>
            <Link to="/history" className="text-sm font-semibold text-emerald-800 hover:underline">
              See all
            </Link>
          </div>

          <Card>
            {transactions.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-medium text-slate-800">No transactions yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Your transfers will show up here.{' '}
                  <Link to="/transfer" className="font-semibold text-emerald-800 hover:underline">
                    Send money
                  </Link>
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isOutgoing = tx.senderAccountNumber === account?.accountNumber;
                  const counterparty = isOutgoing ? tx.receiverName : tx.senderName;
                  const sign = isOutgoing ? '−' : '+';
                  return (
                    <li key={tx.reference} className="flex items-center gap-3 p-4">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isOutgoing ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isOutgoing ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {isOutgoing ? 'To' : 'From'} {counterparty || 'Unknown'}
                        </p>
                        <p className="truncate text-xs capitalize text-slate-500">
                          {formatDate(tx.createdAt)} · {tx.type.replace('_', ' ').toLowerCase()}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`text-sm font-semibold ${
                            isOutgoing ? 'text-slate-900' : 'text-emerald-700'
                          }`}
                        >
                          {sign} {formatNaira(tx.amount)}
                        </p>
                        <div className="mt-1">
                          <StatusBadge status={tx.status} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}