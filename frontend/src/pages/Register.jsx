import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-3"
      >
        <h1 className="text-2xl font-bold text-slate-800">Create account</h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            required placeholder="First name"
            value={form.firstName} onChange={set('firstName')}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <input
            required placeholder="Last name"
            value={form.lastName} onChange={set('lastName')}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <input
          type="email" required placeholder="Email"
          value={form.email} onChange={set('email')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        <input
          type="tel" required placeholder="Phone (e.g. 08012345678)"
          value={form.phone} onChange={set('phone')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        <div>
          <label className="block text-xs text-slate-500 mb-1">Date of birth</label>
          <input
            type="date" required
            value={form.dob} onChange={set('dob')}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <input
          type="password" required placeholder="Password" minLength={6}
          value={form.password} onChange={set('password')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        <button
          type="submit" disabled={busy}
          className="w-full bg-slate-800 text-white rounded py-2 hover:bg-slate-900 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-sm text-slate-500 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-slate-800 underline">Login</Link>
        </p>
      </form>
    </div>
  );
}