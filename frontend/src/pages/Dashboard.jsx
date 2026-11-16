import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { customer, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">
            Welcome, {customer?.firstName || 'Customer'}
          </h1>
          <button
            onClick={logout}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Logout
          </button>
        </div>
        <p className="text-slate-500 mt-2 text-sm">
          Dashboard placeholder — Step 14 will fill this in.
        </p>
      </div>
    </div>
  );
}