import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDate } from '../lib/format';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500">Welcome back</p>
            <h1 className="text-xl font-bold text-slate-800">
              {customer?.firstName} {customer?.lastName}
            </h1>
          </div>
          <button
            onClick={logout}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {/* Account card */}
        {account && (
          <div className="bg-slate-800 text-white rounded-xl shadow p-6 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Account number
                </p>
                <p className="font-mono text-lg">{account.accountNumber}</p>
                <p className="text-sm text-slate-300 mt-1">{account.accountName}</p>
              </div>
              <button
                onClick={refreshBalance}
                disabled={refreshingBalance}
                className="text-xs text-slate-300 hover:text-white underline disabled:opacity-60"
              >
                {refreshingBalance ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Available balance
              </p>
              <p className="text-3xl font-bold">{formatNaira(account.balance)}</p>
              <div className="flex gap-2 pt-2">
  <Link
    to="/transfer"
    className="flex-1 text-center bg-white text-slate-800 rounded py-2 text-sm font-semibold hover:bg-slate-100"
  >
    Send money
  </Link>
  <Link
    to="/history"
    className="flex-1 text-center border border-white/30 text-white rounded py-2 text-sm hover:bg-white/10"
  >
    History
  </Link>
</div>
            </div>
          </div>
          
        )}

        {/* Recent transactions */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-800">Recent transactions</h2>
            <Link
              to="/history"
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              View all →
            </Link>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isOutgoing = tx.senderAccountNumber === account?.accountNumber;
                const counterparty = isOutgoing ? tx.receiverName : tx.senderName;
                const sign = isOutgoing ? '−' : '+';
                return (
                  <li key={tx.reference} className="py-3 flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {isOutgoing ? 'To' : 'From'} {counterparty || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(tx.createdAt)} · {tx.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          isOutgoing ? 'text-slate-800' : 'text-green-600'
                        }`}
                      >
                        {sign} {formatNaira(tx.amount)}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          tx.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-700'
                            : tx.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Transfer &amp; full history — coming in step 15
        </p>
      </div>
    </div>
  );
}