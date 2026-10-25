require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const { rateLimit } = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// 1. HELMET: Configures secure HTTP response headers to protect against common web vulnerabilities
app.use(helmet());

// 2. CORS: Explicit domain boundaries to block unauthorized origin requests
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', // Adjust this to match your frontend URL
  credentials: true, // Allows secure HttpOnly cookies to pass through cross-origin requests
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key']
}));

// 3. RATE LIMITING: Prevents brute-force credential stuffing and Denial of Service (DoS) attacks
const securityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute monitoring window
  limit: 100, // Restricts each IP to 100 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many API requests detected from this endpoint.' }
});
app.use('/api/', securityLimiter);

// Parse request data with strict constraints
app.use(express.json({ limit: '10kb' })); // Rejects large payload packets designed to crash the event loop
app.use(cookieParser());

// 4. NOSQL INJECTION PROTECTION: Sanitizes incoming request bodies by stripping out malicious MongoDB query operators (like $, .)
app.use(mongoSanitize());

// Connect to Database
connectDB();

// Application Routes Core Definitions
app.post('/api/auth/register', (req, res) => res.json({ success: true, msg: 'Harden Register Endpoint Trace' }));
app.post('/api/auth/login', (req, res) => res.json({ success: true, msg: 'Harden Login Endpoint Trace' }));

// Centralized error handler to prevent stack traces from leaking to clients
app.use((err, req, res, next) => {
  console.error(`💥 [System Level Error]: ${err.message}`);
  res.status(500).json({ success: false, message: 'A critical processing exception occurred.' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 [Secure Server Container] Running on port ${PORT}`));
}

module.exports = app; // Exported to support automated security penetration testing
