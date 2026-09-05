const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const { rows } = await db.query(
      `SELECT id, password_hash, first_name, last_name, kyc_verified FROM customers WHERE email = $1`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const customer = rows[0];
    const match = await bcrypt.compare(password, customer.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ customerId: customer.id }, config.app.jwtSecret, {
      expiresIn: config.app.jwtExpiresIn,
    });

    return res.json({
      token,
      customer: {
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        kycVerified: customer.kyc_verified,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login };
