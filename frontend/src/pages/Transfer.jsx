import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatNaira, formatDate } from '../lib/format';

export default function Transfer() {
  const [ownAccount, setOwnAccount] = useState(null);

  const [toAccountNumber, setToAccountNumber] = useState('');
  const [recipient, setRecipient] = useState(null); // { accountName, bankName }
  const [enquiryBusy, setEnquiryBusy] = useState(false);
  const [enquiryError, setEnquiryError] = useState('');

  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/accounts/me');
        setOwnAccount(data.account);
      } catch { /* protect route handles auth errors */ }
    })();
  }, []);

  // Reset recipient if the account number changes
  useEffect(() => {
    setRecipient(null);
    setEnquiryError('');
  }, [toAccountNumber]);

  const onVerify = async () => {
    if (!/^\d{10}$/.test(toAccountNumber)) {
      setEnquiryError('Account number must be exactly 10 digits');
      return;
    }
    if (ownAccount?.accountNumber === toAccountNumber) {
      setEnquiryError('Cannot transfer to yourself');
      return;
    }
    setEnquiryBusy(true); setEnquiryError('');
    try {
      const { data } = await api.get(`/accounts/name-enquiry/${toAccountNumber}`);
      setRecipient({ accountName: data.accountName, bankName: data.bankName });
    } catch (err) {
      setEnquiryError(err.response?.data?.message || 'Recipient not found');
    } finally {
      setEnquiryBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!recipient) return;
    setSubmitting(true); setSubmitError('');
    try {
      const { data } = await api.post('/transfers', {
        toAccountNumber,
        amount: Number(amount),
        narration,
      });
      setReceipt(data.transaction);
      setToAccountNumber(''); setRecipient(null);
      setAmount(''); setNarration('');
    } catch (err) {
      const status = err.response?.status;
      if (status >= 500) {
        setSubmitError(
          'Transfer status unknown — the money may have moved. Check Transaction History for the final status.'
        );
      } else {
        setSubmitError(err.response?.data?.message || 'Transfer failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Link to="/dashboard" className="text-sm text-slate-600 underline">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-slate-800">Send money</h1>
          <span className="w-10" />
        </div>

        {ownAccount && (
          <p className="text-xs text-slate-500 text-center">
            From <span className="font-mono">{ownAccount.accountNumber}</span> ·{' '}
            {formatNaira(ownAccount.balance)}
          </p>
        )}

        <form onSubmit={onSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          {/* Step 1: recipient */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Recipient account number
            </label>
            <div className="flex gap-2">
              <input
                required
                inputMode="numeric"
                maxLength={10}
                value={toAccountNumber}
                onChange={(e) => setToAccountNumber(e.target.value.replace(/\D/g, ''))}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono"
                placeholder="10-digit account"
              />
              <button
                type="button"
                onClick={onVerify}
                disabled={enquiryBusy || toAccountNumber.length !== 10}
                className="px-3 py-2 bg-slate-700 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-60"
              >
                {enquiryBusy ? '…' : 'Verify'}
              </button>
            </div>
            {enquiryError && (
              <p className="text-sm text-red-600 mt-1">{enquiryError}</p>
            )}
            {recipient && (
              <div className="mt-2 text-sm bg-green-50 border border-green-200 rounded p-2">
                <p className="font-semibold text-green-800">{recipient.accountName}</p>
                <p className="text-green-700 text-xs">{recipient.bankName}</p>
              </div>
            )}
          </div>

          {/* Step 2: amount + narration (only enabled after verification) */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">Amount (₦)</label>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!recipient}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Narration (optional)
            </label>
            <input
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              disabled={!recipient}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50"
              placeholder="e.g. lunch"
            />
          </div>

          {submitError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={!recipient || submitting}
            className="w-full bg-slate-800 text-white rounded py-2 hover:bg-slate-900 disabled:opacity-60"
          >
            {submitting ? 'Sending…' : `Send ${amount ? formatNaira(Number(amount)) : ''}`}
          </button>
        </form>

        {receipt && (
          <div className="bg-white rounded-xl shadow p-6 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">
                ✓
              </span>
              <h2 className="font-semibold text-green-700">Transfer successful</h2>
            </div>
            <p className="font-mono text-xs text-slate-500">{receipt.reference}</p>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <span className="text-slate-500">To</span>
              <span className="text-right">{receipt.receiverName}</span>
              <span className="text-slate-500">Account</span>
              <span className="text-right font-mono">{receipt.receiverAccountNumber}</span>
              <span className="text-slate-500">Amount</span>
              <span className="text-right font-semibold">{formatNaira(receipt.amount)}</span>
              <span className="text-slate-500">Type</span>
              <span className="text-right">{receipt.type.replace('_', ' ')}</span>
              <span className="text-slate-500">Time</span>
              <span className="text-right">{formatDate(receipt.createdAt)}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Link
                to="/dashboard"
                className="flex-1 text-center text-sm border rounded py-2 hover:bg-slate-50"
              >
                Dashboard
              </Link>
              <Link
                to="/history"
                className="flex-1 text-center text-sm bg-slate-800 text-white rounded py-2 hover:bg-slate-900"
              >
                View history
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}