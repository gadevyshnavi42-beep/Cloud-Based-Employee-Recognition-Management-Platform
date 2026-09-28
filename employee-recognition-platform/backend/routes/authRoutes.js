// Register and login. Both return a JWT token.
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { clean, isEmail } = require('../utils/validate');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const department = clean(req.body.department);
    const employeeId = clean(req.body.employeeId);

    if (!name || !email || !password || !department || !employeeId) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!isEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (exists) return res.status(400).json({ message: 'Email or Employee ID is already registered' });

    // Public registration always creates a normal employee
    const user = await User.create({ name, email, password, department, employeeId, role: 'employee' });
    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const email = clean(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(user._id), user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
