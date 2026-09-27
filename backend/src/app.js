const express = require('express');

const app = express();

app.use(express.json()); // parses JSON request bodies into req.body

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;