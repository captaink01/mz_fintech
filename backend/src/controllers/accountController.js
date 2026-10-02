const nibss = require('../clients/nibssClient');
const Account = require('../models/Account');
const ApiError = require('../utils/ApiError');

function accountView(account) {
  return {
    id: account._id,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    bankCode: account.bankCode,
    balance: account.balance,
    createdAt: account.createdAt,
  };
}

// POST /api/accounts
exports.createAccount = async (req, res, next) => {
  try {
    const customer = req.customer;

    if (!customer.isVerified) {
      throw new ApiError(403, 'Customer must be verified before creating an account');
    }

    // Which KYC did they use? BVN takes priority if both are set.
    const kycType = customer.bvn ? 'BVN' : customer.nin ? 'NIN' : null;
    const kycID = customer.bvn || customer.nin;

    if (!kycType) {
      throw new ApiError(400, 'No verified KYC on file');
    }

    // Optional: check for existing account locally first — cheap, fast rejection
    const existing = await Account.findOne({ customerId: customer._id });
    if (existing) {
      throw new ApiError(409, 'Account already exists for this customer');
    }

    // Call Nibss. If it already has an account for this KYC, it will error.
    const nibssAccount = await nibss.createAccount({
      kycType,
      kycID,
      dob: customer.dob.toISOString().split('T')[0],
    });

    // Store what Nibss returned. If two requests raced, one will hit the unique
    // index on customerId and fail — that's caught by the error handler as 409.
    const account = await Account.create({
      accountNumber: nibssAccount.accountNumber,
      accountName: nibssAccount.accountName,
      bankCode: nibssAccount.bankCode,
      balance: nibssAccount.balance,
      customerId: customer._id,
    });

    res.status(201).json({
      message: 'Account created successfully',
      account: accountView(account),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/accounts/me
exports.getMyAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ customerId: req.customer._id });
    if (!account) {
      return res.status(404).json({ message: 'No account yet' });
    }

    res.status(200).json({ account: accountView(account) });
  } catch (error) {
    next(error);
  }
};

// GET /api/accounts/balance
// Live balance — reads from Nibss, not our local copy.
// Our local copy can drift; Nibss is the source of truth.
exports.getBalance = async (req, res, next) => {
  try {
    const account = await Account.findOne({ customerId: req.customer._id });
    if (!account) {
      return res.status(404).json({ message: 'No account yet' });
    }

    const { balance } = await nibss.getBalance({ accountNumber: account.accountNumber });

    // Sync our local copy so it doesn't drift
    if (balance !== account.balance) {
      account.balance = balance;
      await account.save();
    }

    res.status(200).json({ accountNumber: account.accountNumber, balance });
  } catch (error) {
    next(error);
  }
};