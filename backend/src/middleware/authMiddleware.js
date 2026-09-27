const jwt = require('jsonwebtoken');

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const customer = await Customer.findById(decoded.id);
    if (!customer) {
      return res.status(401).json({ message: 'Customer no longer exists' });
    }

    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
module.exports = { protect };