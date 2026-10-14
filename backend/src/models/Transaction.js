const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    type: { type: String, enum: ['INTRA_BANK', 'INTER_BANK'], required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    amount: { type: Number, required: true },
    narration: { type: String, default: '' },

    // Sender (denormalized — the value at time of transfer)
    senderAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    senderAccountNumber: { type: String, required: true },
    senderName: { type: String, required: true },

    // Receiver (denormalized)
    receiverAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    receiverAccountNumber: { type: String, required: true },
    receiverName: { type: String, required: true },
    receiverBankName: { type: String, default: null },

    // Correlation with Nibss
    nibssTransactionId: { type: String, default: null },
    failureReason: { type: String, default: null },

    // Who initiated — for data isolation queries
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);