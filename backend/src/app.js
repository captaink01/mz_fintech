const express = require('express');
const errorHandler = require('./middleware/errorHandler');



const app = express();

app.use(express.json()); // parses JSON request bodies into req.body

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


app.use(errorHandler);
app.use('/api/auth', require('./routes/authRoutes'));


module.exports = app;