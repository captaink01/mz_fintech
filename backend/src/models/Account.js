const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, required: true, unique: true },
    accountName: { type: String, required: true },
    bankCode: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true, // ← one account per customer, enforced at the DB level
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);