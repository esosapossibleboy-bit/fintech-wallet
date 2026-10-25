const mongoose = require('mongoose');
const crypto = require('crypto');

const transactionSchema = new mongoose.Schema({
  senderWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  receiverWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Transaction amount must be at least 0.01']
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending'
  },
  reference: {
    type: String,
    unique: true, // This satisfies your strict unique index requirement safely
    default: () => `TXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}` 
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
