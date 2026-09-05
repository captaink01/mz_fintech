const bcrypt = require('bcryptjs');
const nibss = require('../integrations/nibssClient');
const db = require('../db');
const { generateFakeKycId } = require('../utils/idGenerator');

const VALID_KYC_TYPES = ['bvn', 'nin'];


async function onboardCustomer(req, res, next) {
  try {
    const { firstName, lastName, email, password, phone, dob, kycType } = req.body;

    if (!firstName || !lastName || !email || !password || !dob || !kycType) {
      return res.status(400).json({
        message: 'firstName, lastName, email, password, dob and kycType are required',
      });
    }

    const normalizedKycType = String(kycType).toLowerCase();
    if (!VALID_KYC_TYPES.includes(normalizedKycType)) {
      return res.status(400).json({ message: "kycType must be 'bvn' or 'nin'" });
    }

    if (normalizedKycType === 'bvn' && !phone) {
      return res.status(400).json({ message: 'phone is required when kycType is bvn' });
    }

    const existing = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'A customer with this email already exists' });
    }

  
    const kycId = generateFakeKycId();

    
    if (normalizedKycType === 'bvn') {
      await nibss.insertBvn({ bvn: kycId, firstName, lastName, dob, phone });
    } else {
      await nibss.insertNin({ nin: kycId, firstName, lastName, dob });
    }

    // Step 2: immediately validate it back to confirm NIBSS accepted it.
    const validation =
      normalizedKycType === 'bvn' ? await nibss.validateBvn(kycId) : await nibss.validateNin(kycId);

    
    const isVerified = validation.valid === true || validation.success === true;
    if (!isVerified) {
      return res.status(422).json({ message: 'Identity verification failed at NIBSS', validation });
    }

    
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO customers (first_name, last_name, email, password_hash, phone, dob, kyc_type, kyc_id, kyc_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING id, first_name, last_name, email, phone, dob, kyc_type, kyc_id, kyc_verified, created_at`,
      [firstName, lastName, email, passwordHash, phone || null, dob, normalizedKycType, kycId]
    );

    return res.status(201).json({
      message: 'Customer onboarded and identity verified. You may now create an account.',
      customer: rows[0],
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { onboardCustomer };
