// User management. Everything here requires login.
const express = require('express');
const fs = require('fs');
const User = require('../models/User');
const Recognition = require('../models/Recognition');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const upload = require('../middleware/upload');
const { getUserStats } = require('../utils/stats');
const { clean, isEmail, idParam } = require('../utils/validate');

const router = express.Router();
const ROLES = ['employee', 'manager', 'admin'];

router.param('id', idParam);
router.use(auth);

// GET /api/users  -> list of all users (used for the "select employee" dropdown)
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id  -> one user + recognition counts + achievements
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const stats = await getUserStats(user._id, user.recognitionPoints);
    res.json({ user, ...stats });
  } catch (err) {
    next(err);
  }
});

// POST /api/users  -> admin adds an employee
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const department = clean(req.body.department);
    const employeeId = clean(req.body.employeeId);
    const role = clean(req.body.role) || 'employee';

    if (!name || !email || !password || !department || !employeeId) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!isEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const exists = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (exists) return res.status(400).json({ message: 'Email or Employee ID is already registered' });

    const user = await User.create({ name, email, password, department, employeeId, role });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id  -> update own profile (or any user if admin). Accepts JSON or multipart (profile picture).
router.put('/:id', upload.single('profileImage'), async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isSelf = String(req.user._id) === req.params.id;
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'You can only edit your own profile' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const department = clean(req.body.department);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (name) user.name = name;
    if (department) user.department = department;

    if (email && email !== user.email) {
      if (!isEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
      if (await User.findOne({ email, _id: { $ne: user._id } })) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
      user.email = email;
    }

    if (password) {
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      user.password = password; // hashed automatically on save
    }

    // Only admins can change role and employee ID
    if (isAdmin) {
      const role = clean(req.body.role);
      if (role) {
        if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
        if (isSelf && role !== 'admin') return res.status(400).json({ message: 'You cannot remove your own admin role' });
        user.role = role;
      }
      const employeeId = clean(req.body.employeeId);
      if (employeeId && employeeId !== user.employeeId) {
        if (await User.findOne({ employeeId, _id: { $ne: user._id } })) {
          return res.status(400).json({ message: 'Employee ID is already in use' });
        }
        user.employeeId = employeeId;
      }
    }

    if (req.file) user.profileImage = '/uploads/' + req.file.filename;

    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id  -> admin only
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    if (String(req.user._id) === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove recognitions sent by this user and take the points back from the receivers
    const sent = await Recognition.find({ sender: user._id });
    for (const r of sent) {
      await User.findByIdAndUpdate(r.receiver, { $inc: { recognitionPoints: -r.points } });
    }
    await Recognition.deleteMany({ $or: [{ sender: user._id }, { receiver: user._id }] });
    await Notification.deleteMany({ user: user._id });
    await user.deleteOne();

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
