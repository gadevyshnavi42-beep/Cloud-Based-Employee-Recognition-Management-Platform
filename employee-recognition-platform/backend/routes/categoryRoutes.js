// Read-only list of categories for any logged-in user (admins manage them in adminRoutes).
const express = require('express');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/categories
router.get('/', auth, async (req, res, next) => {
  try {
    res.json(await Category.find().sort({ name: 1 }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
