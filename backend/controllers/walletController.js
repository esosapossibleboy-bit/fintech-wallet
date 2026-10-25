const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const IdempotencyRecord = require('../models/IdempotencyRecord');

exports.transferFunds = async (req, res) => {
  const { recipientEmail, amount } = req.body;
  const senderId = req.user._id;
  
  // Extract custom idempotency header signature
  const idempotencyKey = req.headers['idempotency-key'];

  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid transaction amount' });
  }

  // 1. DEDUPLICATION LAYER: Intercept request signatures if an idempotency key is present
  if (idempotencyKey) {
    const existingRecord = await IdempotencyRecord.findOne({ idempotencyKey });
    if (existingRecord) {
      console.log(`🛡️  [Deduplication Interceptor Triggered] Replaying cached response for key: ${idempotencyKey}`);
      return res.status(existingRecord.responseStatus).json(existingRecord.responseBody);
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const senderWallet = await Wallet.findOne({ user: senderId }).session(session);
    if (!senderWallet) throw new Error('Sender wallet context not found');
    if (senderWallet.balance < amount) throw new Error('Insufficient available balance');

    const User = mongoose.model('User');
    const recipientUser = await User.findOne({ email: recipientEmail }).session(session);
    if (!recipientUser) throw new Error('Recipient user account not found');

    const receiverWallet = await Wallet.findOne({ user: recipientUser._id }).session(session);
    if (!receiverWallet) throw new Error('Recipient wallet context not found');

    const senderUpdate = await Wallet.findOneAndUpdate(
      { _id: senderWallet._id, balance: { $gte: amount } }, 
      { $inc: { balance: -amount } },
      { session, new: true }
    );
    if (!senderUpdate) throw new Error('Concurrency collision: Balance state altered during checkout');

    await Wallet.findByIdAndUpdate(receiverWallet._id, { $inc: { balance: amount } }, { session });

    const transaction = await Transaction.create([{
      senderWallet: senderWallet._id,
      receiverWallet: receiverWallet._id,
      amount,
      status: 'Completed'
    }], { session });

    const successResponseBody = { 
      success: true, 
      message: 'Transfer executed successfully', 
      transactionId: transaction[0]._id 
    };

    // 2. PERSISTENCE LAYER: Save execution output cache states before committing data updates
    if (idempotencyKey) {
      await IdempotencyRecord.create([{
        idempotencyKey,
        responseStatus: 200,
        responseBody: successResponseBody
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(successResponseBody);

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    const failureResponseBody = { success: false, message: error.message };

    // Cache structural engine failure states safely if an idempotency key was supplied
    if (idempotencyKey) {
      try {
        await IdempotencyRecord.create({
          idempotencyKey,
          responseStatus: 400,
          responseBody: failureResponseBody
        });
      } catch (cacheErr) {
        // Fallback catch if records were committed by a parallel run sequence
      }
    }

    return res.status(400).json(failureResponseBody);
  }
};
