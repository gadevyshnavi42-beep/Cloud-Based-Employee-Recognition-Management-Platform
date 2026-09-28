// Recognitions: create, list, edit, delete, like and comment.
const express = require('express');
const fs = require('fs');
const path = require('path');
const Recognition = require('../models/Recognition');
const User = require('../models/User');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const notify = require('../utils/notify');
const { clean, isValidId, idParam } = require('../utils/validate');

const router = express.Router();
const USER_FIELDS = 'name employeeId department profileImage';
const POPULATE = [
  { path: 'sender', select: USER_FIELDS },
  { path: 'receiver', select: USER_FIELDS },
  { path: 'comments.user', select: 'name profileImage' }
];

router.param('id', idParam);
router.use(auth);

// Deletes an uploaded image file (ignores errors)
const removeFile = (webPath) => {
  if (!webPath) return;
  fs.unlink(path.join(__dirname, '..', webPath), () => {});
};

// POST /api/recognitions
router.post('/', upload.single('image'), async (req, res, next) => {
  // Helper: reject the request and delete any uploaded file
  const fail = (code, message) => {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(code).json({ message });
  };

  try {
    const receiver = clean(req.body.receiver);
    const categoryName = clean(req.body.category);
    const title = clean(req.body.title);
    const message = clean(req.body.message);
    const points = Number(req.body.points);

    if (!receiver || !categoryName || !title || !message || req.body.points === undefined) {
      return fail(400, 'Employee, category, title, message and points are required');
    }
    if (!isValidId(receiver)) return fail(400, 'Invalid employee selected');
    if (receiver === String(req.user._id)) return fail(400, 'You cannot recognise yourself');
    if (!Number.isInteger(points) || points < 1 || points > 100) return fail(400, 'Points must be a whole number from 1 to 100');
    if (title.length > 100) return fail(400, 'Title must be 100 characters or fewer');
    if (message.length > 1000) return fail(400, 'Message must be 1000 characters or fewer');

    const receiverUser = await User.findById(receiver);
    if (!receiverUser) return fail(404, 'Selected employee not found');

    const category = await Category.findOne({ name: categoryName });
    if (!category) return fail(400, 'Selected category does not exist');

    const recognition = await Recognition.create({
      sender: req.user._id,
      receiver,
      category: category.name,
      title,
      message,
      points,
      image: req.file ? '/uploads/' + req.file.filename : ''
    });

    await User.findByIdAndUpdate(receiver, { $inc: { recognitionPoints: points } });

    await notify(receiver, `${req.user.name} recognised you: "${title}"`, 'recognition');
    await notify(receiver, `You received ${points} points from ${req.user.name}`, 'points');

    await recognition.populate(POPULATE);
    res.status(201).json(recognition);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// GET /api/recognitions?receiver=&sender=&category=&limit=
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.receiver && isValidId(req.query.receiver)) filter.receiver = req.query.receiver;
    if (req.query.sender && isValidId(req.query.sender)) filter.sender = req.query.sender;
    if (req.query.category) filter.category = String(req.query.category);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);

    const list = await Recognition.find(filter).sort({ createdAt: -1 }).limit(limit).populate(POPULATE);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/recognitions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const rec = await Recognition.findById(req.params.id).populate(POPULATE);
    if (!rec) return res.status(404).json({ message: 'Recognition not found' });
    res.json(rec);
  } catch (err) {
    next(err);
  }
});

// PUT /api/recognitions/:id  (sender or admin) - edit title, message, category, points
router.put('/:id', async (req, res, next) => {
  try {
    const rec = await Recognition.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Recognition not found' });

    const isOwner = String(rec.sender) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the sender or an admin can edit this recognition' });
    }

    const title = clean(req.body.title);
    const message = clean(req.body.message);
    const categoryName = clean(req.body.category);

    if (title) rec.title = title;
    if (message) rec.message = message;

    if (categoryName) {
      const category = await Category.findOne({ name: categoryName });
      if (!category) return res.status(400).json({ message: 'Selected category does not exist' });
      rec.category = category.name;
    }

    if (req.body.points !== undefined) {
      const points = Number(req.body.points);
      if (!Number.isInteger(points) || points < 1 || points > 100) {
        return res.status(400).json({ message: 'Points must be a whole number from 1 to 100' });
      }
      const diff = points - rec.points;
      if (diff !== 0) await User.findByIdAndUpdate(rec.receiver, { $inc: { recognitionPoints: diff } });
      rec.points = points;
    }

    await rec.save();
    await rec.populate(POPULATE);
    res.json(rec);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/recognitions/:id  (sender or admin)
router.delete('/:id', async (req, res, next) => {
  try {
    const rec = await Recognition.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Recognition not found' });

    const isOwner = String(rec.sender) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the sender or an admin can delete this recognition' });
    }

    // Take the points back from the receiver
    await User.findByIdAndUpdate(rec.receiver, { $inc: { recognitionPoints: -rec.points } });
    removeFile(rec.image);
    await rec.deleteOne();
    res.json({ message: 'Recognition deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/recognitions/:id/like  -> toggles like / unlike
router.post('/:id/like', async (req, res, next) => {
  try {
    const rec = await Recognition.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Recognition not found' });

    const me = String(req.user._id);
    const alreadyLiked = rec.likes.some((id) => String(id) === me);

    if (alreadyLiked) {
      rec.likes = rec.likes.filter((id) => String(id) !== me);
    } else {
      rec.likes.push(req.user._id);
    }
    await rec.save();

    // Notify the receiver and the sender (never the person who liked)
    if (!alreadyLiked) {
      const targets = new Set([String(rec.receiver), String(rec.sender)]);
      targets.delete(me);
      for (const userId of targets) {
        await notify(userId, `${req.user.name} liked the recognition "${rec.title}"`, 'like');
      }
    }

    await rec.populate(POPULATE);
    res.json(rec);
  } catch (err) {
    next(err);
  }
});

// POST /api/recognitions/:id/comments
router.post('/:id/comments', async (req, res, next) => {
  try {
    const text = clean(req.body.text);
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
    if (text.length > 500) return res.status(400).json({ message: 'Comment must be 500 characters or fewer' });

    const rec = await Recognition.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Recognition not found' });

    rec.comments.push({ user: req.user._id, text });
    await rec.save();

    const me = String(req.user._id);
    const targets = new Set([String(rec.receiver), String(rec.sender)]);
    targets.delete(me);
    for (const userId of targets) {
      await notify(userId, `${req.user.name} commented on "${rec.title}"`, 'comment');
    }

    await rec.populate(POPULATE);
    res.status(201).json(rec);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
