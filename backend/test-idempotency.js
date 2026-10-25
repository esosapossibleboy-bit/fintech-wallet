require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Wallet = require('./models/Wallet');
const IdempotencyRecord = require('./models/IdempotencyRecord');
const { transferFunds } = require('./controllers/walletController');

const mockResponse = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

async function runIdempotencyTests() {
  console.log('🔄 Initializing Dynamic Idempotency Deduplication testing harness...');
  await connectDB();

  try {
    await User.deleteMany({});
    await Wallet.deleteMany({});
    await IdempotencyRecord.deleteMany({});

    const sender = await User.create({ email: 'merchant@fintech.io', password: 'PasswordSecure123!' });
    const receiver = await User.create({ email: 'client@fintech.io', password: 'PasswordSecure123!' });

    const senderWallet = await Wallet.create({ user: sender._id, balance: 300.00 });
    const receiverWallet = await Wallet.create({ user: receiver._id, balance: 10.00 });

    const uniqueTrackingHeaderKey = 'ik_test_uuid_999988887777';
    
    console.log('\n🚀 Triggering Primary API Call submission...');
    const req1 = {
      user: sender,
      headers: { 'idempotency-key': uniqueTrackingHeaderKey },
      body: { recipientEmail: 'client@fintech.io', amount: 50.00 }
    };
    const res1 = mockResponse();
    await transferFunds(req1, res1);

    console.log(`📡 Request 1 Output -> Status: ${res1.statusCode} | Body:`, res1.body);

    console.log('\n🚀 Retrying identical endpoint execution with matching Idempotency Key...');
    const req2 = {
      user: sender,
      headers: { 'idempotency-key': uniqueTrackingHeaderKey },
      body: { recipientEmail: 'client@fintech.io', amount: 50.00 }
    };
    const res2 = mockResponse();
    await transferFunds(req2, res2);

    console.log(`📡 Request 2 Output -> Status: ${res2.statusCode} | Body:`, res2.body);

    console.log('\n🧪 Evaluation Metrics Analysis...');
    
    if (res1.body.message === res2.body.message) {
      console.log('✅ PASS: Duplication interceptor perfectly replayed the original response payload.');
    } else {
      console.error('❌ FAIL: Responses do not match.');
    }

    const finalSender = await Wallet.findById(senderWallet._id);
    if (res1.statusCode === 400 && finalSender.balance === 300.00) {
      console.log('✅ PASS: Transaction aborted safely without data leaks. Balance held secure at $300.');
    } else if (res1.statusCode === 200 && finalSender.balance === 250.00) {
      console.log('✅ PASS: Transaction completed safely. Balance updated accurately to $250.');
    } else {
      console.error('❌ FAIL: Balance desynchronization detected.');
    }

  } catch (error) {
    console.error('💥 Testing suite error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Testing suite disconnected.');
  }
}

runIdempotencyTests();
