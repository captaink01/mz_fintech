const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Render (and most hosts) sit behind a proxy
app.set('trust proxy', 1);

// CLIENT_URL can hold one or more origins, comma-separated, NO trailing slash.
// e.g. https://bank-app.vercel.app,https://bank.yourportfolio.com
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Lightweight check — use this as Render's "Health Check Path"
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Point cron-job.org here every 10 min: keeps Render awake AND
// touches MongoDB so Atlas never sees the cluster as inactive.
app.get('/keepalive', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/onboarding', require('./routes/onboardingRoutes'));
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/transfers', require('./routes/transactionRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;