// Entry point: starts the Express server, connects to MongoDB and serves the frontend.
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const Category = require('./models/Category');
const defaultCategories = require('./utils/defaultCategories');

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is missing in .env - using an insecure development secret.');
  process.env.JWT_SECRET = 'dev_only_secret_change_me';
}

const app = express();

// ----- Middleware -----
app.use(cors());
app.use(express.json());

// Uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ----- API routes -----
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/recognitions', require('./routes/recognitionRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Unknown API route -> JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ----- Frontend (static files) -----
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ----- Central error handler -----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 2 MB' : err.message;
  } else if (err.code === 11000) {
    status = 400;
    message = 'Email or Employee ID already exists';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID';
  }

  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Something went wrong on the server' : message });
});

// ----- Start -----
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Create the default categories the first time the app runs
  if ((await Category.countDocuments()) === 0) {
    await Category.insertMany(defaultCategories);
    console.log('✅ Default categories created');
  }
  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
});
