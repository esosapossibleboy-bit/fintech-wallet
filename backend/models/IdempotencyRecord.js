const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema({
  idempotencyKey: {
    type: String,
    required: true,
    unique: true // Guarantees duplicate structural signatures hit a database wall immediately
  },
  responseStatus: {
    type: Number,
    required: true
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatic TTL index: drops records cleanly after 24 hours (86,400 seconds)
  }
});

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
