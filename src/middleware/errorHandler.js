const { NibssApiError } = require('../integrations/nibssClient');


function errorHandler(err, req, res, next) {
  if (err instanceof NibssApiError) {
    return res.status(err.status).json({
      message: err.message,
      source: 'nibss-by-phoenix',
      details: err.details,
    });
  }

  if (err.code === '23505') {
    // Postgres unique violation
    return res.status(409).json({ message: 'A record with these details already exists' });
  }

  console.error('[error]', err);
  return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
}

module.exports = errorHandler;
