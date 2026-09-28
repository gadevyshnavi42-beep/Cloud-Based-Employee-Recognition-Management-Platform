// Admin / manager dashboard, statistics and category management.
const express = require('express');
const User = require('../models/User');
const Recognition = require('../models/Recognition');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const { adminOnly, managerOrAdmin } = require('../middleware/admin');
const { clean, idParam } = require('../utils/validate');

const router = express.Router();

router.param('id', idParam);
router.use(auth);

// GET /api/admin/dashboard  (manager or admin)
router.get('/dashboard', managerOrAdmin, async (req, res, next) => {
  try {
    const [totalUsers, totalRecognitions, totalCategories, recentRecognitions, recentUsers] = await Promise.all([
      User.countDocuments(),
      Recognition.countDocuments(),
      Category.countDocuments(),
      Recognition.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('sender receiver', 'name employeeId department profileImage'),
      User.find().select('-password').sort({ createdAt: -1 }).limit(5)
    ]);
    res.json({ totalUsers, totalRecognitions, totalCategories, recentRecognitions, recentUsers });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/statistics  (manager or admin)
router.get('/statistics', managerOrAdmin, async (req, res, next) => {
  try {
    const [totalEmployees, totalRecognitions, pointsAgg, byCategory, top] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Recognition.countDocuments(),
      Recognition.aggregate([{ $group: { _id: null, total: { $sum: '$points' } } }]),
      Recognition.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Recognition.aggregate([
        { $group: { _id: '$receiver', count: { $sum: 1 }, points: { $sum: '$points' } } },
        { $sort: { count: -1, points: -1 } },
        { $limit: 1 }
      ])
    ]);

    let mostRecognized = null;
    if (top.length) {
      const u = await User.findById(top[0]._id).select('name department profileImage');
      if (u) mostRecognized = { user: u, count: top[0].count, points: top[0].points };
    }

    res.json({
      totalEmployees,
      totalRecognitions,
      totalPoints: pointsAgg.length ? pointsAgg[0].total : 0,
      mostRecognized,
      byCategory: byCategory.map((c) => ({ category: c._id, count: c.count }))
    });
  } catch (err) {
    next(err);
  }
});

// ----- Category management (admin only) -----

// POST /api/admin/categories
router.post('/categories', adminOnly, async (req, res, next) => {
  try {
    const name = clean(req.body.name);
    const description = clean(req.body.description);
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    if (await Category.findOne({ name })) return res.status(400).json({ message: 'Category already exists' });

    const category = await Category.create({ name, description });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', adminOnly, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    if (await Category.findOne({ name, _id: { $ne: category._id } })) {
      return res.status(400).json({ message: 'Another category already uses that name' });
    }

    const oldName = category.name;
    category.name = name;
    category.description = clean(req.body.description);
    await category.save();

    // Keep existing recognitions consistent with the new name
    if (oldName !== name) await Recognition.updateMany({ category: oldName }, { category: name });

    res.json(category);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', adminOnly, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    await category.deleteOne();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
