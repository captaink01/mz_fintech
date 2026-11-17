import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AuthLayout, { ErrorBanner, Field, SubmitButton } from '../components/AuthLayout';
import { PageLoader, CheckIcon } from '../components/AppShell';

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
    return <PageLoader label="Checking your account…" />;
  }

  return (
    <AuthLayout
      title="Set up your account"
      subtitle="Verify your identity, then open your bank account."
      footer={
        <button
          type="button"
          onClick={logout}
          className="font-semibold text-emerald-800 hover:underline"
        >
          Log out
        </button>
      }
    >
      <ol className="space-y-4">
        {/* ── Step 1: KYC ── */}
        <li className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <StepBadge done={isVerified} active={!isVerified}>1</StepBadge>
            <h2 className="font-semibold text-slate-900">Verify your identity</h2>
          </div>

          {isVerified ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Verified with your {customer.hasBvn ? 'BVN' : 'NIN'}.
            </p>
          ) : (
            <form onSubmit={onVerifyKyc} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {['BVN', 'NIN'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kycType === k}
                    onClick={() => { setKycType(k); setKycValue(''); setKycError(''); }}
                    className={`h-10 rounded-lg text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 ${
                      kycType === k
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <ErrorBanner>{kycError}</ErrorBanner>

              <Field
                label={`${kycType} (11 digits)`}
                required
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
                placeholder={`Enter 11-digit ${kycType}`}
                inputClassName="font-mono tracking-wide"
                value={kycValue}
                onChange={(e) => setKycValue(e.target.value.replace(/\D/g, ''))}
              />

              <SubmitButton
                busy={kycBusy}
                busyText="Verifying…"
                disabled={kycValue.length !== 11}
              >
                Verify {kycType}
              </SubmitButton>
            </form>
          )}
        </li>

        {/* ── Step 2: Create account ── */}
        <li
          className={`rounded-2xl border border-slate-200 p-5 transition ${
            isVerified ? '' : 'opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <StepBadge active={isVerified}>2</StepBadge>
            <h2 className="font-semibold text-slate-900">Create your bank account</h2>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Your new account will be pre-funded with{' '}
            <span className="font-semibold text-slate-800">₦15,000</span> for testing.
          </p>

          <div className="mt-4 space-y-4">
            <ErrorBanner>{accountError}</ErrorBanner>

            <SubmitButton
              type="button"
              onClick={onCreateAccount}
              busy={accountBusy}
              busyText="Creating account…"
              disabled={!isVerified}
            >
              Create account
            </SubmitButton>
          </div>
        </li>
      </ol>
    </AuthLayout>
  );
}

function StepBadge({ done, active, children }) {
  const tone = done
    ? 'bg-emerald-600 text-white'
    : active
    ? 'bg-emerald-800 text-white'
    : 'bg-slate-200 text-slate-600';
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${tone}`}>
      {done ? <CheckIcon className="h-4 w-4" /> : children}
    </span>
  );
}