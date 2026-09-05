const nibss = require('../integrations/nibssClient');
const db = require('../db');


async function initiateTransfer(req, res, next) {
  try {
    const { toAccountNumber, amount } = req.body;
    const fromAccountNumber = req.customer.accountNumber;

    if (!fromAccountNumber) {
      return res.status(404).json({ message: 'You do not have an account yet' });
    }
    if (!toAccountNumber || !amount) {
      return res.status(400).json({ message: 'toAccountNumber and amount are required' });
    }
    if (toAccountNumber === fromAccountNumber) {
      return res.status(400).json({ message: 'Cannot transfer to your own account' });
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

   
    const recipient = await nibss.nameEnquiry(toAccountNumber);
    const recipientName = recipient.accountName || recipient.name || recipient.accountHolderName || null;

    const localRecipient = await db.query(`SELECT id FROM accounts WHERE account_number = $1`, [
      toAccountNumber,
    ]);
    const direction = localRecipient.rows.length > 0 ? 'INTRA' : 'INTER';

    const transferResult = await nibss.transfer({
      from: fromAccountNumber,
      to: toAccountNumber,
      amount: numericAmount,
    });

    
    const transactionId =
      transferResult.transactionId || transferResult.transaction_id || transferResult.reference || transferResult.txnId;
    const status = transferResult.status || transferResult.transactionStatus || 'SUCCESS';

    if (!transactionId) {
      console.error('[initiateTransfer] Unrecognized NIBSS transfer response shape:', JSON.stringify(transferResult));
      return res.status(502).json({
        message: 'NIBSS returned an unexpected response shape for the transfer',
        raw: transferResult,
      });
    }

    await db.query(
      `INSERT INTO transactions (transaction_id, initiator_customer_id, from_account, to_account, amount, direction, status, raw_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [transactionId, req.customer.id, fromAccountNumber, toAccountNumber, numericAmount, direction, status, transferResult]
    );

    // Refresh local balance caches from source of truth (NIBSS). Best-effort:
    // if this fails, the transfer itself already succeeded, so we don't let
    // a cache-refresh error mask that success.
    try {
      const freshSenderBalance = await nibss.getBalance(fromAccountNumber);
      const senderBal = freshSenderBalance.balance ?? freshSenderBalance.accountBalance;
      if (senderBal !== undefined) {
        await db.query(`UPDATE accounts SET balance = $1 WHERE account_number = $2`, [senderBal, fromAccountNumber]);
      }
      if (direction === 'INTRA') {
        const freshRecipientBalance = await nibss.getBalance(toAccountNumber);
        const recipientBal = freshRecipientBalance.balance ?? freshRecipientBalance.accountBalance;
        if (recipientBal !== undefined) {
          await db.query(`UPDATE accounts SET balance = $1 WHERE account_number = $2`, [recipientBal, toAccountNumber]);
        }
      }
    } catch (cacheErr) {
      console.error('[initiateTransfer] Balance cache refresh failed (non-fatal):', cacheErr.message);
    }

    return res.status(200).json({
      transactionId,
      status,
      amount: numericAmount,
      from: fromAccountNumber,
      to: toAccountNumber,
      direction,
      recipientName,
      raw: transferResult,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { initiateTransfer };
