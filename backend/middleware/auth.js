const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Cryptographically verify the short-lived access token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Hydrate request object with target context, omitting the hashed credential
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Identity context lost. User no longer exists.' });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Access token validation failed or expired.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing structural authorization bearer signature.' });
  }
};

module.exports = { protect };
