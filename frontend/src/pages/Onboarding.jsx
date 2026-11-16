import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const { customer, updateCustomer, logout } = useAuth();
  const navigate = useNavigate();

  const [checkingAccount, setCheckingAccount] = useState(true);

  const [kycType, setKycType] = useState('BVN');
  const [kycValue, setKycValue] = useState('');
  const [kycError, setKycError] = useState('');
  const [kycBusy, setKycBusy] = useState(false);

  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState('');

  const isVerified = Boolean(customer?.hasBvn || customer?.hasNin);

  // If the user already has an account, skip ahead.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.get('/accounts/me');
        if (!cancelled) navigate('/dashboard', { replace: true });
      } catch (err) {
        if (err.response?.status !== 404) {
          console.warn('[onboarding] account check failed', err.message);
        }
      } finally {
        if (!cancelled) setCheckingAccount(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const onVerifyKyc = async (e) => {
    e.preventDefault();
    setKycError(''); setKycBusy(true);
    try {
      const path = kycType === 'BVN' ? '/onboarding/bvn' : '/onboarding/nin';
      const body = kycType === 'BVN' ? { bvn: kycValue } : { nin: kycValue };
      const { data } = await api.post(path, body);
      updateCustomer(data.customer);
      setKycValue('');
    } catch (err) {
      setKycError(err.response?.data?.message || 'Verification failed');
    } finally {
      setKycBusy(false);
    }
  };

  const onCreateAccount = async () => {
    setAccountError(''); setAccountBusy(true);
    try {
      await api.post('/accounts');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAccountError(err.response?.data?.message || 'Account creation failed');
    } finally {
      setAccountBusy(false);
    }
  };

  if (checkingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">Checking your account…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Onboarding</h1>
          <button onClick={logout} className="text-sm text-slate-600 underline">
            Logout
          </button>
        </div>

        {/* ── Step 1: KYC ─────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isVerified ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {isVerified ? '✓' : '1'}
            </div>
            <h2 className="font-semibold text-slate-800">Verify your identity</h2>
          </div>

          {isVerified ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              Verified via {customer.hasBvn ? 'BVN' : 'NIN'}
            </p>
          ) : (
            <form onSubmit={onVerifyKyc} className="space-y-3">
              <div className="flex gap-2">
                {['BVN', 'NIN'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => { setKycType(k); setKycValue(''); setKycError(''); }}
                    className={`flex-1 py-2 rounded border text-sm ${
                      kycType === k
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {kycError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {kycError}
                </div>
              )}

              <input
                required
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
                placeholder={`Enter 11-digit ${kycType}`}
                value={kycValue}
                onChange={(e) => setKycValue(e.target.value.replace(/\D/g, ''))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />

              <button
                type="submit"
                disabled={kycBusy || kycValue.length !== 11}
                className="w-full bg-slate-800 text-white rounded py-2 hover:bg-slate-900 disabled:opacity-60"
              >
                {kycBusy ? 'Verifying…' : `Verify ${kycType}`}
              </button>
            </form>
          )}
        </div>

        {/* ── Step 2: Create account ──────────────────────── */}
        <div className={`bg-white rounded-xl shadow p-6 space-y-4 ${isVerified ? '' : 'opacity-60'}`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isVerified ? 'bg-slate-800 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              2
            </div>
            <h2 className="font-semibold text-slate-800">Create your bank account</h2>
          </div>

          <p className="text-sm text-slate-500">
            Your new account will be pre-funded with <b>₦15,000</b> for testing.
          </p>

          {accountError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {accountError}
            </div>
          )}

          <button
            onClick={onCreateAccount}
            disabled={!isVerified || accountBusy}
            className="w-full bg-slate-800 text-white rounded py-2 hover:bg-slate-900 disabled:opacity-60"
          >
            {accountBusy ? 'Creating account…' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}