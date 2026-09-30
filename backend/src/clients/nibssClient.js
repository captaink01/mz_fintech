const axios = require('axios');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

// ─── Configuration ────────────────────────────────────────────────────────────
const NIBSS_BASE_URL = process.env.NIBSS_BASE_URL;
const NIBSS_API_KEY = process.env.NIBSS_API_KEY;
const NIBSS_API_SECRET = process.env.NIBSS_API_SECRET;
const TIMEOUT_MS = 40000; // Render cold starts can take 30s+

// ─── HTTP client ──────────────────────────────────────────────────────────────
const http = axios.create({
  baseURL: NIBSS_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token cache ──────────────────────────────────────────────────────────────
// Module-level state. Lives for the life of the Node process.
//
// Nibss tokens expire 1 hour after issue (per their docs). Rather than hardcode
// "1 hour", we decode the token and read its `exp` claim — if they change the
// lifetime, this code keeps working.
let cachedToken = null;
let cachedTokenExpiresAt = 0; // ms since epoch
let inflightTokenRequest = null; // de-dupes concurrent refreshes

async function fetchNewToken() {
  const { data } = await http.post('/api/auth/token', {
    apiKey: NIBSS_API_KEY,
    apiSecret: NIBSS_API_SECRET,
  });

  const decoded = jwt.decode(data.token);
  if (!decoded || !decoded.exp) {
    throw new ApiError(502, 'NibssByPhoenix returned an unparseable token');
  }

  cachedToken = data.token;
  // Refresh 5 minutes before actual expiry, to avoid racing a request against the clock.
  // For a 1-hour token this means we refresh roughly every 55 minutes.
  cachedTokenExpiresAt = decoded.exp * 1000 - 5 * 60 * 1000;

  return cachedToken;
}

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) {
    return cachedToken;
  }
  // If a refresh is already in progress, wait for it instead of firing a second one.
  if (inflightTokenRequest) {
    return inflightTokenRequest;
  }
  inflightTokenRequest = fetchNewToken().finally(() => {
    inflightTokenRequest = null;
  });
  return inflightTokenRequest;
}

// ─── Request interceptor: attach token to every call ─────────────────────────
http.interceptors.request.use(async (config) => {
  // The token endpoint itself doesn't need a token.
  if (config.url === '/api/auth/token') return config;

  const token = await getToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor: normalize errors, retry on 401 once ───────────────
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    // Self-healing: if we get a 401 on a call that HAD a token, drop the cache
    // and retry once. Protects against clock skew or a revoked token.
    if (
      error.response?.status === 401 &&
      !config._retried &&
      config.url !== '/api/auth/token'
    ) {
      config._retried = true;
      cachedToken = null;
      cachedTokenExpiresAt = 0;
      const token = await getToken();
      config.headers.Authorization = `Bearer ${token}`;
      return http(config);
    }

    if (error.code === 'ECONNABORTED') {
      throw new ApiError(504, 'NibssByPhoenix did not respond in time');
    }
    if (!error.response) {
      throw new ApiError(502, 'Could not reach NibssByPhoenix');
    }

    const status = error.response.status;
    const payload = error.response.data || {};
    const message =
      payload.message || payload.error || `NibssByPhoenix error (${status})`;

    if (status === 401 || status === 403) {
      throw new ApiError(502, 'NibssByPhoenix authentication failed');
    }
    if (status >= 400 && status < 500) {
      throw new ApiError(400, message);
    }
    throw new ApiError(502, message);
  }
);

// ─── Public API ───────────────────────────────────────────────────────────────
// One method per Nibss endpoint we use. Each returns OUR shape, not theirs.

async function insertBvn({ bvn, firstName, lastName, dob, phone }) {
  const { data } = await http.post('/api/insertBvn', {
    bvn,
    firstName,
    lastName,
    dob,
    phone,
  });
  return { message: data.message ?? 'BVN created successfully', raw: data };
}

async function insertNin({ nin, firstName, lastName, dob }) {
  const { data } = await http.post('/api/insertNin', {
    nin,
    firstName,
    lastName,
    dob,
  });
  return { message: data.message ?? 'NIN created successfully', raw: data };
}

async function createAccount({ kycType, kycID, dob }) {
  const { data } = await http.post('/api/account/create', {
    kycType: kycType.toUpperCase(),
    kycID,
    dob,
  });
  return {
    accountNumber: data.account.accountNumber,
    accountName: data.account.accountName,
    bankCode: data.account.bankCode,
    balance: data.account.balance,
    raw: data,
  };
}

async function nameEnquiry({ accountNumber }) {
  const { data } = await http.get(`/api/account/name-enquiry/${accountNumber}`);
  return {
    accountNumber: data.accountNumber,
    accountName: data.accountName,
    bankName: data.bankName,
    raw: data,
  };
}

async function getBalance({ accountNumber }) {
  const { data } = await http.get(`/api/account/balance/${accountNumber}`);
  return { accountNumber: data.accountNumber, balance: data.balance, raw: data };
}

async function initiateTransfer({ from, to, amount }) {
  // Nibss expects amount as a STRING. Convert here so callers never have to remember.
  const { data } = await http.post('/api/transfer', {
    from,
    to,
    amount: String(amount),
  });
  return {
    transactionId: data.transactionId,
    status: data.status,
    amount: data.amount,
    from: data.from,
    to: data.to,
    raw: data,
  };
}

async function getTransaction({ transactionId }) {
  const { data } = await http.get(`/api/transaction/${transactionId}`);
  return {
    transactionId: data.transactionId,
    status: data.status,
    amount: data.amount,
    from: data.from,
    to: data.to,
    timestamp: data.timestamp,
    raw: data,
  };
}

module.exports = {
  insertBvn,
  insertNin,
  createAccount,
  nameEnquiry,
  getBalance,
  initiateTransfer,
  getTransaction,
};