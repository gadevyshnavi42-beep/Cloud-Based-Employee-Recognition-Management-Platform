// Leaderboard: employees ranked by recognition points.
const express = require('express');
const User = require('../models/User');
const Recognition = require('../models/Recognition');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/leaderboard
router.get('/', auth, async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('name employeeId department profileImage recognitionPoints')
      .sort({ recognitionPoints: -1, name: 1 });

    // Count how many recognitions each user has received
    const counts = await Recognition.aggregate([{ $group: { _id: '$receiver', count: { $sum: 1 } } }]);
    const countMap = {};
    counts.forEach((c) => (countMap[String(c._id)] = c.count));

    res.json(
      users.map((u, index) => ({
        rank: index + 1,
        _id: u._id,
        name: u.name,
        employeeId: u.employeeId,
        department: u.department,
        profileImage: u.profileImage,
        recognitionPoints: u.recognitionPoints,
        recognitionCount: countMap[String(u._id)] || 0
      }))
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
