// Small validation helpers shared by the routes.
const mongoose = require('mongoose');

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Use with router.param('id', idParam) to reject malformed ids early
const idParam = (req, res, next, id) => {
  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid ID' });
  next();
};

module.exports = { clean, isEmail, isValidId, idParam };
