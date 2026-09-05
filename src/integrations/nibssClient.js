const axios = require('axios');
const config = require('../config');
const tokenManager = require('./tokenManager');

const http = axios.create({
  baseURL: config.nibss.baseUrl,
  timeout: 15000,
});


class NibssApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'NibssApiError';
    this.status = status || 502;
    this.details = details;
  }
}


function normalize(raw) {
  if (raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return { ...raw, ...raw.data };
  }
  return raw;
}

async function authedRequest({ method, url, data, params }) {
  const token = await tokenManager.getToken();
  try {
    const res = await http.request({
      method,
      url,
      data,
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return normalize(res.data);
  } catch (err) {
    throw toNibssApiError(err);
  }
}

async function publicRequest({ method, url, data, params }) {
  try {
    const res = await http.request({ method, url, data, params });
    return normalize(res.data);
  } catch (err) {
    throw toNibssApiError(err);
  }
}

function toNibssApiError(err) {
  if (err.response) {
    const message = err.response.data?.message || 'NIBSS by Phoenix API request failed';
    return new NibssApiError(message, err.response.status, err.response.data);
  }
  return new NibssApiError(err.message || 'NIBSS by Phoenix API is unreachable', 502);
}

module.exports = {
  NibssApiError,

  // ---- Fintech onboarding & auth (no token required) ----
  onboardFintech: (name, email) =>
    publicRequest({ method: 'post', url: '/api/fintech/onboard', data: { name, email } }),

  login: (apiKey, apiSecret) =>
    publicRequest({ method: 'post', url: '/api/auth/token', data: { apiKey, apiSecret } }),

  // ---- Identity store 
  insertBvn: ({ bvn, firstName, lastName, dob, phone }) =>
    publicRequest({ method: 'post', url: '/api/insertBvn', data: { bvn, firstName, lastName, dob, phone } }),

  insertNin: ({ nin, firstName, lastName, dob }) =>
    publicRequest({ method: 'post', url: '/api/insertNin', data: { nin, firstName, lastName, dob } }),

  validateBvn: (bvn) => publicRequest({ method: 'post', url: '/api/validateBvn', data: { bvn } }),

  validateNin: (nin) => publicRequest({ method: 'post', url: '/api/validateNin', data: { nin } }),

  // ---- Account operations (bearer token required) ----
  createAccount: ({ kycType, kycID, dob }) =>
    authedRequest({ method: 'post', url: '/api/account/create', data: { kycType, kycID, dob } }),

  getAllAccounts: () => authedRequest({ method: 'get', url: '/api/accounts' }),

  getBalance: (accountNumber) =>
    authedRequest({ method: 'get', url: `/api/account/balance/${accountNumber}` }),

  
  nameEnquiry: async (accountNumber) => {
    try {
      return await authedRequest({ method: 'get', url: `/api/account/name-enquiry/${accountNumber}` });
    } catch (err) {
      if (err instanceof NibssApiError && err.status === 404) {
        return authedRequest({ method: 'get', url: `/api/account/nameenquiry/${accountNumber}` });
      }
      throw err;
    }
  },

  // ---- Transactions (bearer token required) ----
  transfer: ({ from, to, amount }) =>
    authedRequest({ method: 'post', url: '/api/transfer', data: { from, to, amount: String(amount) } }),

  getTransactionStatus: (transactionId) =>
    authedRequest({ method: 'get', url: `/api/transaction/${transactionId}` }),
};
