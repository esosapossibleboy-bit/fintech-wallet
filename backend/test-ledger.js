require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Wallet = require('./models/Wallet');
const { transferFunds } = require('./controllers/walletController');

const mockResponse = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

async function runLedgerTests() {
  console.log('🔄 Initializing Wallet Ledger ACID testing harness...');
  await connectDB();

  try {
    // Setup two unique users for transaction testing execution
    await User.deleteMany({});
    await Wallet.deleteMany({});

    const sender = await User.create({ email: 'sender@bank.com', password: 'PasswordSecure123!' });
    const receiver = await User.create({ email: 'receiver@bank.com', password: 'PasswordSecure123!' });

    // Seed initial fund allocations
    const senderWallet = await Wallet.create({ user: sender._id, balance: 500.00 });
    const receiverWallet = await Wallet.create({ user: receiver._id, balance: 50.00 });

    console.log(`💰 Balances Seeded -> Sender: $${senderWallet.balance} | Receiver: $${receiverWallet.balance}`);

    // TEST A: Standard Authorized Transfer Execution
    console.log('\n🧪 Test A: Executing valid transfer workflow ($100)...');
    const reqA = {
      user: sender,
      body: { recipientEmail: 'receiver@bank.com', amount: 100.00 }
    };
    const resA = mockResponse();

    await transferFunds(reqA, resA);

    const updatedSender = await Wallet.findById(senderWallet._id);
    const updatedReceiver = await Wallet.findById(receiverWallet._id);

    if (resA.statusCode === 200 && updatedSender.balance === 400.00 && updatedReceiver.balance === 150.00) {
      console.log(`✅ PASS: Balances mutated correctly. Sender: $${updatedSender.balance} | Receiver: $${updatedReceiver.balance}`);
    } else {
      console.error('❌ FAIL: Balance calculations resulted in desynchronization.', resA.body);
    }

    // TEST B: Overdraft Enforcement Guardrail
    console.log('\n🧪 Test B: Forcing an overdraft exception checkout ($1000)...');
    const reqB = {
      user: sender,
      body: { recipientEmail: 'receiver@bank.com', amount: 1000.00 }
    };
    const resB = mockResponse();

    await transferFunds(reqB, resB);

    const postFailedSender = await Wallet.findById(senderWallet._id);
    if (resB.statusCode === 400 && postFailedSender.balance === 400.00) {
      console.log(`✅ PASS: Engine correctly blocked overdraft. Message: "${resB.body.message}"`);
      console.log(`🛡️  ACID Safety Verified: Sender balance preserved at exact historical level ($${postFailedSender.balance})`);
    } else {
      console.error('❌ FAIL: Overdraft was permitted or account values leaked balance snapshots.', resB.body);
    }

  } catch (error) {
    console.error('💥 Critical ledger routine exception failure:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Testing suite disconnected cleanly from MongoDB cluster.');
  }
}

runLedgerTests();
