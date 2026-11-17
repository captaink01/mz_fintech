import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDate } from '../lib/format';
import AppShell, { Card, PageHeader, StatusBadge, ChevronDownIcon } from '../components/AppShell';
import { ErrorBanner } from '../components/AuthLayout';

const selectClass =
  'h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10';

export default function History() {
  const { customer } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null); // reference string
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const fetchPage = async (page = 1) => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/transfers', {
        params: {
          page,
          limit: 10,
          type: type || undefined,
          status: status || undefined,
        },
      });
      setTransactions(data.transactions || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  return (
    <AppShell>
      <PageHeader
        title="History"
        back="/dashboard"
        action={
          <Link
            to="/transfer"
            className="rounded-lg bg-emerald-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30"
          >
            Send
          </Link>
        }
      />

      <div className="space-y-4">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by type"
            className={selectClass}
          >
            <option value="">All types</option>
            <option value="INTRA_BANK">Intra-bank</option>
            <option value="INTER_BANK">Inter-bank</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className={selectClass}
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <ErrorBanner>{error}</ErrorBanner>

        <Card className="divide-y divide-slate-100 overflow-hidden">
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center justify-between gap-4 p-4">
                <div className="space-y-2">
                  <div className="h-3.5 w-40 rounded bg-slate-100" />
                  <div className="h-3 w-28 rounded bg-slate-100" />
                </div>
                <div className="space-y-2">
                  <div className="ml-auto h-3.5 w-20 rounded bg-slate-100" />
                  <div className="ml-auto h-3 w-14 rounded bg-slate-100" />
                </div>
              </div>
            ))
          ) : transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium text-slate-800">No transactions found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing or clearing your filters.
              </p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isExpanded = expanded === tx.reference;
              return (
                <div key={tx.reference}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : tx.reference)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {tx.senderName} → {tx.receiverName}
                      </p>
                      <p className="truncate text-xs capitalize text-slate-500">
                        {formatDate(tx.createdAt)} · {tx.type.replace('_', ' ').toLowerCase()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatNaira(tx.amount)}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={tx.status} />
                      </div>
                    </div>
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="space-y-2.5 border-t border-slate-100 bg-slate-50 px-4 py-4 text-sm">
                      <Row label="Reference" value={tx.reference} mono />
                      <Row label="From" value={`${tx.senderName} · ${tx.senderAccountNumber}`} />
                      <Row label="To" value={`${tx.receiverName} · ${tx.receiverAccountNumber} (${tx.receiverBankName})`} />
                      <Row label="Narration" value={tx.narration || '—'} />
                      {tx.nibssTransactionId && (
                        <Row label="Nibss ID" value={tx.nibssTransactionId} mono />
                      )}
                      {tx.failureReason && (
                        <Row label="Failure" value={tx.failureReason} />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => fetchPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => fetchPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-slate-500">{label}</span>
      <span className={`min-w-0 break-all text-slate-800 ${mono ? 'font-mono text-xs leading-5' : ''}`}>
        {value}
      </span>
    </div>
  );
}