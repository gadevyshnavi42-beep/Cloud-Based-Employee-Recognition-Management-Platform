// Notifications for the logged-in user.
const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { idParam } = require('../utils/validate');

const router = express.Router();

router.param('id', idParam);
router.use(auth);

// GET /api/notifications  -> latest 50
router.get('/', async (req, res, next) => {
  try {
    const list = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all  (must be defined before /:id/read)
router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res, next) => {
  try {
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: 'Notification not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
