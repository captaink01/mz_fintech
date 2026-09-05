const nibss = require('../integrations/nibssClient');
const { NibssApiError } = nibss;
const tokenManager = require('../integrations/tokenManager');
const db = require('../db');


async function createAccount(req, res, next) {
  try {
    const customerId = req.customer.id;

    const { rows: customerRows } = await db.query(
      `SELECT first_name, last_name, kyc_type, kyc_id, to_char(dob, 'YYYY-MM-DD') AS dob, kyc_verified
       FROM customers WHERE id = $1`,
      [customerId]
    );
    const customer = customerRows[0];

    if (!customer.kyc_verified) {
      return res.status(403).json({
        message: 'Customer identity is not verified yet. Complete onboarding before creating an account.',
      });
    }

    const { rows: existingAccounts } = await db.query(
      `SELECT account_number FROM accounts WHERE customer_id = $1`,
      [customerId]
    );
    if (existingAccounts.length > 0) {
      return res.status(409).json({
        message: 'This customer already has an account. Only one account per customer is allowed.',
        account: existingAccounts[0],
      });
    }

    
    if (req.body?.reconcileAccountNumber) {
      const saved = await reconcileAccount(customerId, req.body.reconcileAccountNumber);
      return res.status(201).json({ message: 'Existing NIBSS account linked successfully', account: saved });
    }

    let nibssResponse;
    try {
      nibssResponse = await nibss.createAccount({
        kycType: customer.kyc_type,
        kycID: customer.kyc_id,
        dob: customer.dob,
      });
    } catch (err) {
      
      if (err instanceof NibssApiError && /already linked/i.test(err.message)) {
        const allAccounts = await nibss.getAllAccounts();
        const list = allAccounts.accounts || allAccounts.data || [];
        const fullName = `${customer.first_name} ${customer.last_name}`.trim().toLowerCase();

        const alreadyClaimed = new Set(
          (await db.query('SELECT account_number FROM accounts')).rows.map((r) => r.account_number)
        );
        const candidates = list.filter(
          (a) =>
            !alreadyClaimed.has(a.accountNumber) &&
            String(a.accountName || '').trim().toLowerCase() === fullName
        );

        if (candidates.length === 1) {
          const saved = await reconcileAccount(customerId, candidates[0].accountNumber, candidates[0].balance);
          return res.status(201).json({
            message: 'This BVN/NIN already had a NIBSS account from a previous attempt -- linked it automatically.',
            account: saved,
          });
        }

        return res.status(409).json({
          message:
            candidates.length === 0
              ? "This BVN/NIN is already linked to a NIBSS account, but it couldn't be matched by name automatically."
              : 'Multiple unclaimed accounts match this name -- pick the right one manually.',
          hint: 'Retry this request with { "reconcileAccountNumber": "<the correct 10-digit account number>" } in the body.',
          candidates: candidates.length > 0 ? candidates : undefined,
          unclaimedAccounts: candidates.length === 0 ? list.filter((a) => !alreadyClaimed.has(a.accountNumber)) : undefined,
        });
      }
      throw err;
    }

    const accountNumber = nibssResponse.accountNumber || nibssResponse.account_number || nibssResponse.accountNo;
    const bankCode = nibssResponse.bankCode || nibssResponse.bank_code;
    const bankName = nibssResponse.bankName || nibssResponse.bank_name;
    const balance = nibssResponse.balance ?? nibssResponse.accountBalance;

    if (!accountNumber) {
      console.error('[createAccount] Unrecognized NIBSS response shape:', JSON.stringify(nibssResponse));
      return res.status(502).json({
        message: 'NIBSS returned an unexpected response shape for account creation',
        raw: nibssResponse,
      });
    }

    const { rows } = await db.query(
      `INSERT INTO accounts (customer_id, account_number, bank_code, bank_name, balance)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING account_number, bank_code, bank_name, balance, created_at`,
      [customerId, accountNumber, bankCode, bankName, balance]
    );

    return res.status(201).json({ message: 'Account created successfully', account: rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** Fetches an account's live balance/name from NIBSS and saves it locally for a customer. */
async function reconcileAccount(customerId, accountNumber, knownBalance) {
  const bankInfo = tokenManager.getBankInfo() || {};
  let balance = knownBalance;
  if (balance === undefined) {
    const balanceResp = await nibss.getBalance(accountNumber);
    balance = balanceResp.balance;
  }

  const { rows } = await db.query(
    `INSERT INTO accounts (customer_id, account_number, bank_code, bank_name, balance)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING account_number, bank_code, bank_name, balance, created_at`,
    [customerId, accountNumber, bankInfo.bankCode || 'UNKNOWN', bankInfo.bankName || 'UNKNOWN', balance]
  );
  return rows[0];
}

/** Returns the authenticated customer's own account -- never anyone else's. */
async function getMyAccount(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT account_number, bank_code, bank_name, balance, created_at FROM accounts WHERE customer_id = $1`,
      [req.customer.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No account found for this customer yet' });
    }
    return res.json({ account: rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** Live balance check against NIBSS, restricted to the caller's own account. */
async function getMyBalance(req, res, next) {
  try {
    if (!req.customer.accountNumber) {
      return res.status(404).json({ message: 'No account found for this customer yet' });
    }

    const nibssBalance = await nibss.getBalance(req.customer.accountNumber);
    const balance = nibssBalance.balance ?? nibssBalance.accountBalance ?? nibssBalance.ledgerBalance;

    if (balance === undefined) {
      console.error('[getMyBalance] Unrecognized NIBSS balance response shape:', JSON.stringify(nibssBalance));
      return res.status(502).json({ message: 'NIBSS returned an unexpected balance response shape', raw: nibssBalance });
    }

    await db.query(`UPDATE accounts SET balance = $1 WHERE account_number = $2`, [
      balance,
      req.customer.accountNumber,
    ]);

    return res.json({ accountNumber: req.customer.accountNumber, balance });
  } catch (err) {
    return next(err);
  }
}

/**
 * Name enquiry is a pre-transfer lookup on a RECIPIENT's account number.
 * This is intentionally not restricted to the caller's own account --
 * that's the whole point of the endpoint -- but it never exposes anything
 * beyond the public account-holder name NIBSS itself returns.
 */
async function nameEnquiry(req, res, next) {
  try {
    const { accountNumber } = req.params;
    const result = await nibss.nameEnquiry(accountNumber);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { createAccount, getMyAccount, getMyBalance, nameEnquiry };
