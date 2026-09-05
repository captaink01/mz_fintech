require('dotenv').config();

function required(name, { optional = false } = {}) {
  const value = process.env[name];
  if (!value && !optional) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Warning: env var ${name} is not set yet.`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 4000,

  app: {
    jwtSecret: required('APP_JWT_SECRET'),
    jwtExpiresIn: process.env.APP_JWT_EXPIRES_IN || '12h',
  },

  db: {
    connectionString: required('DATABASE_URL'),
  },

  nibss: {
    baseUrl: (process.env.NIBSS_BASE_URL || 'https://nibssbyphoenix.onrender.com').replace(/\/+$/, ''),
    apiKey: required('FINTECH_API_KEY', { optional: true }),
    apiSecret: required('FINTECH_API_SECRET', { optional: true }),
  },
};
