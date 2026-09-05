const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');


async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Missing or malformed Authorization header' });
    }

    const payload = jwt.verify(token, config.app.jwtSecret);

    const { rows } = await db.query(
      `SELECT c.id, c.email, c.first_name, c.last_name, a.account_number, a.bank_code
       FROM customers c
       LEFT JOIN accounts a ON a.customer_id = c.id
       WHERE c.id = $1`,
      [payload.customerId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Customer no longer exists' });
    }

    req.customer = {
      id: rows[0].id,
      email: rows[0].email,
      firstName: rows[0].first_name,
      lastName: rows[0].last_name,
      accountNumber: rows[0].account_number, // null if no account yet
      bankCode: rows[0].bank_code,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
