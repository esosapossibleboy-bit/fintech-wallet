const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Wallet balance cannot drop below zero'] // Critical hard stop at schema level
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP'],
    default: 'USD'
  }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
