import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout, { ErrorBanner, Field, SubmitButton } from '../components/AuthLayout';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register(form);
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes about a minute to get started."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-800 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <ErrorBanner>{error}</ErrorBanner>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={set('firstName')}
          />
          <Field
            label="Last name"
            required
            autoComplete="family-name"
            value={form.lastName}
            onChange={set('lastName')}
          />
        </div>

        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
        />

        <Field
          label="Phone number"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder="08012345678"
          value={form.phone}
          onChange={set('phone')}
        />

        <Field
          label="Date of birth"
          type="date"
          required
          autoComplete="bday"
          value={form.dob}
          onChange={set('dob')}
        />

        <Field
          label="Password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Create a password"
          hint="Use at least 6 characters."
          value={form.password}
          onChange={set('password')}
        />

        <SubmitButton busy={busy} busyText="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}