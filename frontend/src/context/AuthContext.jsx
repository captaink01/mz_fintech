import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const cached = localStorage.getItem('customer');
    if (token && cached) setCustomer(JSON.parse(cached));
    setLoading(false);
  }, []);

  const persistSession = (token, customer) => {
    localStorage.setItem('token', token);
    localStorage.setItem('customer', JSON.stringify(customer));
    setCustomer(customer);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persistSession(data.token, data.customer);
    return data.customer;
  };

  // Backend's /auth/register does NOT return a token, so we chain a login.
  const register = async ({ email, phone, password, firstName, lastName, dob }) => {
    await api.post('/auth/register', {
      email, phone, password, firstName, lastName, dob,
    });
    // Auto-login so the user is immediately authenticated
    const { data } = await api.post('/auth/login', { email, password });
    persistSession(data.token, data.customer);
    return data.customer;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ customer, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);