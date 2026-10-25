require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Profile = require('./models/Profile');

async function runValidationTests() {
  console.log('🔄 Initializing system testing harness...');
  await connectDB();

  // Clear existing items to ensure clean test state
  await User.deleteMany({});
  await Profile.deleteMany({});
  console.log('🧹 Test database clean-up complete.');

  try {
    // TEST A: Verify Password Length Constraint
    console.log('\n🧪 Test A: Injecting weak user password (<12 chars)...');
    try {
      await User.create({ email: 'test@wallet.com', password: 'weak' });
      console.error('❌ FAIL: Database accepted an insecure password length.');
    } catch (err) {
      console.log('✅ PASS: Rejected weak password. Error:', err.errors.password.message);
    }

    // TEST B: Verify Email Format Guardrail
    console.log('\n🧪 Test B: Injecting malformed email pattern...');
    try {
      await User.create({ email: 'invalid-email-format', password: 'SuperSecurePassword123!' });
      console.error('❌ FAIL: Database accepted an invalid email string.');
    } catch (err) {
      console.log('✅ PASS: Rejected invalid email layout. Error:', err.errors.email.message);
    }

    // TEST C: Valid Registration and Safe Hashing Checks
    console.log('\n🧪 Test C: Registering clean profile & analyzing salt output...');
    const secureUser = await User.create({
      email: 'founder@fintech.io',
      password: 'SuperSecurePassword123!'
    });

    console.log('🎯 User document committed.');
    console.log('🛡️  Hashed representation value stored:', secureUser.password);
    
    if (secureUser.password.startsWith('$2a$12$') || secureUser.password.startsWith('$2b$12$')) {
      console.log('✅ PASS: Password successfully encrypted using Bcrypt with 12 structural rounds.');
    } else {
      console.error('❌ FAIL: Hashing pattern algorithm did not apply expected strength signature.');
    }

    // TEST D: Verify Password Match Engine
    console.log('\n🧪 Test D: Invoking matching utilities on hashes...');
    const fetchedUser = await User.findById(secureUser._id).select('+password');
    const correctMatch = await fetchedUser.matchPassword('SuperSecurePassword123!');
    const wrongMatch = await fetchedUser.matchPassword('WrongPassword!');
    
    if (correctMatch && !wrongMatch) {
      console.log('✅ PASS: Cryptographic challenge function performs accurately.');
    } else {
      console.error('❌ FAIL: Decryption evaluation algorithm output false-positives.');
    }

    // TEST E: Profile Relation Tracking
    console.log('\n🧪 Test E: Binding Profile structure to User tracking ID...');
    try {
      await Profile.create({
        user: secureUser._id,
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+15555551234'
      });
      console.log('✅ PASS: Sub-document structural bindings created successfully.');
    } catch (err) {
      console.error('❌ FAIL: Profile parsing mapping rejected valid attributes.', err.message);
    }

  } catch (error) {
    console.error('💥 Unexpected critical breakdown occurred:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Testing suite disconnected cleanly from MongoDB cluster.');
  }
}

runValidationTests();
