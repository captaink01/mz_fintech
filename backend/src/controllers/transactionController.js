const crypto = require('crypto');
const nibss = require('../clients/nibssClient');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');

function transactionView(tx) {
  return {
    id: tx._id,
    reference: tx.reference,
    type: tx.type,
    status: tx.status,
    amount: tx.amount,
    narration: tx.narration,
    senderAccountNumber: tx.senderAccountNumber,
    senderName: tx.senderName,
    receiverAccountNumber: tx.receiverAccountNumber,
    receiverName: tx.receiverName,
    receiverBankName: tx.receiverBankName,
    nibssTransactionId: tx.nibssTransactionId,
    failureReason: tx.failureReason,
    createdAt: tx.createdAt,
  };
}

// POST /api/transfers
exports.initiateTransfer = async (req, res, next) => {
  const customer = req.customer;
  let transaction = null;

  try {
    const { toAccountNumber, amount, narration } = req.body;

    // ── 1. Validate input ─────────────────────────────────────────
    if (!toAccountNumber || !amount) {
      throw new ApiError(400, 'toAccountNumber and amount are required');
    }
    if (!/^\d{10}$/.test(toAccountNumber)) {
      throw new ApiError(400, 'toAccountNumber must be exactly 10 digits');
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new ApiError(400, 'Amount must be a positive number');
    }

    // ── 2. Sender's account ───────────────────────────────────────
    const senderAccount = await Account.findOne({ customerId: customer._id });
    if (!senderAccount) {
      throw new ApiError(404, 'You do not have an account yet');
    }
    if (senderAccount.accountNumber === toAccountNumber) {
      throw new ApiError(400, 'Cannot transfer to yourself');
    }

    // ── 3. Name enquiry: confirm recipient exists ────────────────
    // We do this BEFORE the transfer for two reasons:
    //   (a) We need the recipient's name for the transaction receipt.
    //   (b) If the account doesn't exist, we fail cleanly instead of
    //       calling Nibss's transfer endpoint to find out.
    let recipient;
    try {
      recipient = await nibss.nameEnquiry({ accountNumber: toAccountNumber });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 400) {
        throw new ApiError(404, 'Recipient account not found');
      }
      throw err;
    }

    // ── 4. Categorize: intra or inter? ────────────────────────────
    const recipientAccount = await Account.findOne({ accountNumber: toAccountNumber });
    const type = recipientAccount ? 'INTRA_BANK' : 'INTER_BANK';

    // ── 5. Record PENDING BEFORE calling Nibss ───────────────────
    // If our process dies between here and the Nibss response, we have
    // a document to investigate. Without this, a crashed server = no
    // trace of a transfer that might have happened.
    const reference = `TX-${crypto.randomUUID()}`;
    transaction = await Transaction.create({
      reference,
      type,
      status: 'PENDING',
      amount: numericAmount,
      narration: narration || '',
      senderAccountId: senderAccount._id,
      senderAccountNumber: senderAccount.accountNumber,
      senderName: senderAccount.accountName,
      receiverAccountId: recipientAccount?._id || null,
      receiverAccountNumber: toAccountNumber,
      receiverName: recipient.accountName,
      receiverBankName: recipient.bankName,
      customerId: customer._id,
    });

    // ── 6. Call Nibss ─────────────────────────────────────────────
    const result = await nibss.initiateTransfer({
      from: senderAccount.accountNumber,
      to: toAccountNumber,
      amount: numericAmount,
    });

    // ── 7. Update our record with Nibss's verdict ────────────────
    transaction.status = result.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
    transaction.nibssTransactionId = result.transactionId;
    await transaction.save();

    if (transaction.status !== 'SUCCESS') {
      throw new ApiError(400, 'Transfer was declined by Nibss');
    }

    // ── 8. Best-effort balance sync ──────────────────────────────
    // We don't fail the transfer if this fails — the transfer already
    // happened. Next /balance call will correct our cache.
    try {
      const { balance } = await nibss.getBalance({
        accountNumber: senderAccount.accountNumber,
      });
      senderAccount.balance = balance;
      await senderAccount.save();
    } catch (err) {
      console.warn('[transfer] balance sync failed:', err.message);
    }

    res.status(201).json({
      message: 'Transfer successful',
      transaction: transactionView(transaction),
    });
  } catch (error) {
    // ── Handle the PENDING transaction left behind ────────────────
    if (transaction && transaction.status === 'PENDING') {
      // Distinguish "Nibss rejected it" from "we don't know what happened".
      const isAmbiguous =
        !error.statusCode ||
        error.statusCode === 502 ||
        error.statusCode === 504;

      if (isAmbiguous) {
        // Money might have moved. Leave as PENDING for investigation.
        transaction.failureReason = 'Status unknown — investigation required';
        await transaction.save().catch(() => {});
        console.warn(
          '[transfer] AMBIGUOUS RESULT — transaction',
          transaction.reference,
          'needs manual investigation'
        );
      } else {
        transaction.status = 'FAILED';
        transaction.failureReason = error.message;
        await transaction.save().catch(() => {});
      }
    }
    next(error);
  }
};

async function ownTransactionFilter(customerId) {
  const myAccount = await Account.findOne({ customerId }).select('_id');
  const or = [{ customerId }];
  if (myAccount) or.push({ receiverAccountId: myAccount._id });
  return { $or: or };
}

// GET /api/transfers/:reference
exports.getTransactionStatus = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const scope = await ownTransactionFilter(req.customer._id);

    const transaction = await Transaction.findOne({ reference, ...scope });

    if (!transaction) throw new ApiError(404, 'Transaction not found');

    // ... keep the PENDING polling block unchanged ...

    res.status(200).json({ transaction: transactionView(transaction) });
  } catch (error) {
    next(error);
  }
};

// GET /api/transfers?page=1&limit=20&type=&status=
exports.listTransactions = async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip  = (page - 1) * limit;

    const scope = await ownTransactionFilter(req.customer._id);
    const filter = { ...scope };
    if (req.query.type)   filter.type   = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [rows, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      transactions: rows.map(transactionView),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};