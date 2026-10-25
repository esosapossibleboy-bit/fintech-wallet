const User = require('../models/User');
const Profile = require('../models/Profile');
const jwt = require('jsonwebtoken');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

exports.registerUser = async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User account already registered.' });
    }

    const user = await User.create({ email, password });
    await Profile.create({ user: user._id, firstName, lastName, phoneNumber });

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Mandating HttpOnly, SameSite=Strict protection to neutralize XSS payload injection
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      accessToken,
      user: { id: user._id, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
