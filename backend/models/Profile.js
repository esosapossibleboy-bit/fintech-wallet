const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    match: [/^[a-zA-Z\s\-]+$/, 'First name can only contain letters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    match: [/^[a-zA-Z\s\-]+$/, 'Last name can only contain letters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Provide an international format (e.g. +1234567890)']
  }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
