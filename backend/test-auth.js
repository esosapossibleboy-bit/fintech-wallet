require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const { registerUser } = require('./controllers/authController');
const { protect } = require('./middleware/auth');

// Simplified Express Mock Framework for pure functional security unit tests
const mockResponse = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  res.cookie = (name, value, options) => { res.cookieData = { name, value, options }; return res; };
  return res;
};

async function runAuthTests() {
  console.log('🔄 Initializing Authentication testing harness...');
  await connectDB();

  try {
    // TEST A: Sign Up Simulation and Cookie-Isolation verification
    console.log('\n🧪 Test A: Injecting registration payloads & evaluating token structures...');
    const req = {
      body: {
        email: 'wallet-dev@fintech.io',
        password: 'ValidSecurePassword123!',
        firstName: 'Alex',
        lastName: 'Smith',
        phoneNumber: '+19999999999'
      }
    };
    const res = mockResponse();

    await registerUser(req, res);

    if (res.statusCode === 201 && res.body.accessToken && res.cookieData) {
      console.log('✅ PASS: Registration success. Access token distributed inside response layer.');
      if (res.cookieData.options.httpOnly && res.cookieData.options.sameSite === 'strict') {
        console.log('✅ PASS: Refresh token strictly bound to isolated HttpOnly storage config.');
      } else {
        console.error('❌ FAIL: Refresh token cookies lacks structural defense headers.');
      }
    } else {
      console.error('❌ FAIL: Registration function did not yield valid authorization responses.', res.body);
    }

    const validToken = res.body.accessToken;

    // TEST B: Protect Route without Authorization Signatures
    console.log('\n🧪 Test B: Hitting route tracking without injecting access headers...');
    const badReq1 = { headers: {} };
    const badRes1 = mockResponse();
    await protect(badReq1, badRes1, () => {});

    if (badRes1.statusCode === 401) {
      console.log('✅ PASS: Route protection interceptor effectively blocked unauthenticated request.');
    } else {
      console.error('❌ FAIL: Access allowed without authorization headers.');
    }

    // TEST C: Protect Route with Valid Token Verification
    console.log('\n🧪 Test C: Hitting route using authentic Bearer signature payload...');
    const goodReq = { headers: { authorization: `Bearer ${validToken}` } };
    const goodRes = mockResponse();
    let nextCalled = false;

    await protect(goodReq, goodRes, () => { nextCalled = true; });

    if (nextCalled && goodReq.user && goodReq.user.email === 'wallet-dev@fintech.io') {
      console.log('✅ PASS: Bearer signature extracted cleanly. Hydrated user context confirmed.');
    } else {
      console.error('❌ FAIL: Failed to validate or hydrate context from original token.', goodRes.body);
    }

  } catch (error) {
    console.error('💥 Devastating failure during test execution pipeline:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Testing suite disconnected cleanly from MongoDB cluster.');
  }
}

runAuthTests();
