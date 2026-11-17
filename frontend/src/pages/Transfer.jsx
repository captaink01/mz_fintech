import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatNaira, formatDate } from '../lib/format';
import AppShell, { Card, PageHeader, CheckIcon, Spinner } from '../components/AppShell';
import { ErrorBanner, Field, SubmitButton, inputClass } from '../components/AuthLayout';

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
    <AppShell>
      <div className="mx-auto max-w-md">
        <PageHeader title="Send money" back="/dashboard" />

        <div className="space-y-4">
          {ownAccount && (
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span>
                From <span className="font-mono">{ownAccount.accountNumber}</span>
              </span>
              <span className="font-semibold">{formatNaira(ownAccount.balance)}</span>
            </div>
          )}

          {/* Receipt (shown first so it's visible right after sending) */}
          {receipt && (
            <Card className="p-6">
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckIcon className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-emerald-800">Transfer successful</h2>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                  {formatNaira(receipt.amount)}
                </p>
                <p className="mt-1 text-sm text-slate-500">sent to {receipt.receiverName}</p>
              </div>

              <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
                <ReceiptRow label="Account" value={receipt.receiverAccountNumber} mono />
                <ReceiptRow label="Type" value={receipt.type.replace('_', ' ').toLowerCase()} capitalize />
                <ReceiptRow label="Time" value={formatDate(receipt.createdAt)} />
                <ReceiptRow label="Reference" value={receipt.reference} mono small />
              </dl>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  to="/dashboard"
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20"
                >
                  Dashboard
                </Link>
                <Link
                  to="/history"
                  className="flex h-12 items-center justify-center rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30"
                >
                  View history
                </Link>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Recipient */}
              <div>
                <div className="flex items-end gap-2">
                  <Field
                    className="flex-1"
                    label="Recipient account number"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit account number"
                    inputClassName="font-mono tracking-wide"
                    value={toAccountNumber}
                    onChange={(e) => setToAccountNumber(e.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    type="button"
                    onClick={onVerify}
                    disabled={enquiryBusy || toAccountNumber.length !== 10}
                    className="flex h-12 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {enquiryBusy ? <Spinner /> : 'Verify'}
                  </button>
                </div>

                {enquiryError && (
                  <p role="alert" className="mt-2 text-sm text-red-600">
                    {enquiryError}
                  </p>
                )}

                {recipient && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <CheckIcon />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-emerald-900">
                        {recipient.accountName}
                      </p>
                      <p className="truncate text-xs text-emerald-800/80">{recipient.bankName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount (enabled after verification) */}
              <div>
                <label htmlFor="transfer-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-slate-400">
                    ₦
                  </span>
                  <input
                    id="transfer-amount"
                    required
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!recipient}
                    className={`${inputClass} pl-9 text-lg font-semibold`}
                    placeholder="0.00"
                  />
                </div>
                {!recipient && (
                  <p className="mt-1.5 text-xs text-slate-500">Verify the recipient to continue.</p>
                )}
              </div>

              <Field
                label="Narration (optional)"
                placeholder="e.g. lunch"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                disabled={!recipient}
              />

              <ErrorBanner>{submitError}</ErrorBanner>

              <SubmitButton busy={submitting} busyText="Sending…" disabled={!recipient}>
                {`Send ${amount ? formatNaira(Number(amount)) : ''}`.trim()}
              </SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function ReceiptRow({ label, value, mono, small, capitalize }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd
        className={`min-w-0 break-all text-right text-slate-900 ${mono ? 'font-mono' : ''} ${
          small ? 'text-xs leading-5' : ''
        } ${capitalize ? 'capitalize' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}