import axios from 'axios';

const api = axios.create({
  // Must include /api, e.g. https://your-app.onrender.com/api
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000, // survives a Render cold start (~1 min)
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT on every request ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Handle 401 globally (expired/invalid token) ─────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('customer');
      // Avoid redirect loop if we're already on /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;