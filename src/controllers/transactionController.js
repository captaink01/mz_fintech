const nibss = require('../integrations/nibssClient');
const db = require('../db');


async function getTransactionStatus(req, res, next) {
  try {
    const { transactionId } = req.params;
    const myAccount = req.customer.accountNumber;

    const { rows } = await db.query(
      `SELECT * FROM transactions WHERE transaction_id = $1 AND (from_account = $2 OR to_account = $2)`,
      [transactionId, myAccount]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found for this customer' });
    }

    const liveStatus = await nibss.getTransactionStatus(transactionId);
    const status = liveStatus.status || liveStatus.transactionStatus || rows[0].status;

    await db.query(`UPDATE transactions SET status = $1 WHERE transaction_id = $2`, [status, transactionId]);

    return res.json({ ...liveStatus, status });
  } catch (err) {
    return next(err);
  }
}


async function getMyTransactionHistory(req, res, next) {
  try {
    const myAccount = req.customer.accountNumber;
    if (!myAccount) {
      return res.status(404).json({ message: 'You do not have an account yet' });
    }

    const { rows } = await db.query(
      `SELECT transaction_id, from_account, to_account, amount, direction, status, created_at
       FROM transactions
       WHERE from_account = $1 OR to_account = $1
       ORDER BY created_at DESC`,
      [myAccount]
    );

    return res.json({ count: rows.length, transactions: rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getTransactionStatus, getMyTransactionHistory };
