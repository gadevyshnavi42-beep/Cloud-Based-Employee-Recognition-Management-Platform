// Protects routes: requires a valid "Authorization: Bearer <token>" header.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;

  if (!token) return res.status(401).json({ message: 'Not authorised: no token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Not authorised: user no longer exists' });
    req.user = user; // available in all following handlers
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorised: invalid or expired token' });
  }
};
