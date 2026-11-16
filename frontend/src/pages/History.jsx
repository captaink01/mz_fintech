import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDate } from '../lib/format';

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
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Link to="/dashboard" className="text-sm text-slate-600 underline">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-slate-800">Transaction history</h1>
          <Link
            to="/transfer"
            className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-900"
          >
            Send
          </Link>
        </div>

        <div className="flex gap-2 text-sm">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border rounded px-2 py-1.5 bg-white"
          >
            <option value="">All types</option>
            <option value="INTRA_BANK">Intra-bank</option>
            <option value="INTER_BANK">Inter-bank</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded px-2 py-1.5 bg-white"
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow divide-y divide-slate-100">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No transactions match your filters.
            </p>
          ) : (
            transactions.map((tx) => {
              const isExpanded = expanded === tx.reference;
              return (
                <div key={tx.reference}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : tx.reference)}
                    className="w-full text-left p-4 hover:bg-slate-50 flex justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {tx.senderName} → {tx.receiverName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(tx.createdAt)} · {tx.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {formatNaira(tx.amount)}
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
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 text-xs text-slate-600 bg-slate-50 border-t border-slate-100 pt-3 space-y-1">
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
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex justify-between items-center text-sm">
            <button
              onClick={() => fetchPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 border rounded bg-white disabled:opacity-50"
            >
              ← Prev
            </button>
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => fetchPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 border rounded bg-white disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 text-slate-500 shrink-0">{label}</span>
      <span className={`break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}