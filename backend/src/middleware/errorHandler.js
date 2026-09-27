function errorHandler(err, req, res, next) {
  console.error(err);

  // MongoDB duplicate key — e.g. race condition on email uniqueness
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ message: `${field} already exists` });
  }

  // Mongoose validation errors (required, min, etc.)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // JWT-specific errors, in case one slips through
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  res.status(500).json({ message: 'Something went wrong' });
}

module.exports = errorHandler;